from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.data_preparation.repo_manager import (
    get_repo_path,
    get_variables_dir,
    init_repo,
    set_repo_path,
)
from mage_ai.data_preparation.shared.constants import (
    ECS_CLUSTER_NAME,
    GCP_PROJECT_ID,
    MANAGE_ENV_VAR,
)
from mage_ai.data_preparation.variable_manager import (
    VariableManager,
    delete_global_variable,
    set_global_variable,
)
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models import PipelineSchedule
from mage_ai.server.active_kernel import (
    interrupt_kernel,
    restart_kernel,
    start_kernel,
    switch_active_kernel,
)
from mage_ai.server.api.autocomplete_items import ApiAutocompleteItemsHandler
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.api.blocks import (
    ApiBlockHandler,
    ApiPipelineBlockAnalysisHandler,
    ApiPipelineBlockExecuteHandler,
    ApiPipelineBlockHandler,
    ApiPipelineBlockListHandler,
    ApiPipelineBlockOutputHandler,
)
from mage_ai.server.api.clusters import (
    ApiClustersHandler,
    ApiInstanceDetailHandler,
    ApiInstancesHandler,
)
from mage_ai.server.api.data_providers import ApiDataProvidersHandler
from mage_ai.server.api.events import (
    ApiAwsEventRuleListHandler,
    ApiEventHandler,
    ApiEventMatcherDetailHandler,
    ApiEventMatcherListHandler,
)
from mage_ai.server.api.integration_sources import (
    ApiIntegrationDestinationsHandler,
    ApiIntegrationSourceStreamHandler,
    ApiIntegrationSourceHandler,
    ApiIntegrationSourcesHandler,
)
from mage_ai.server.api.logs import ApiPipelineLogListHandler
from mage_ai.server.api.monitor import ApiMonitorStatsHandler
from mage_ai.server.api.orchestration import (
    ApiAllBlockRunListHandler,
    ApiPipelineRunDetailHandler,
    ApiAllPipelineRunListHandler,
    ApiBlockRunDetailHandler,
    ApiBlockRunListHandler,
    ApiBlockRunLogHandler,
    ApiBlockRunOutputHandler,
    ApiPipelineRunListHandler,
    ApiPipelineRunLogHandler,
    ApiPipelineScheduleDetailHandler,
    ApiPipelineScheduleListHandler,
)
from mage_ai.server.api.projects import ApiProjectsHandler
from mage_ai.server.api.widgets import ApiPipelineWidgetDetailHandler, ApiPipelineWidgetListHandler
from mage_ai.server.constants import DATA_PREP_SERVER_PORT
from mage_ai.server.docs_server import run_docs_server
from mage_ai.server.kernel_output_parser import parse_output_message
from mage_ai.server.kernels import (
    DEFAULT_KERNEL_NAME,
    kernel_managers,
    KernelName,
    PIPELINE_TO_KERNEL_NAME,
)
from mage_ai.server.scheduler_manager import scheduler_manager
from mage_ai.server.subscriber import get_messages
from mage_ai.server.websocket import WebSocketServer
from mage_ai.shared.hash import group_by, merge_dict
from sqlalchemy.orm import aliased
from tornado import autoreload
from tornado.log import enable_pretty_logging
import argparse
import asyncio
import json
import os
import socket
import tornado.ioloop
import tornado.web
import urllib.parse


class MainPageHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('index.html')


class PipelineRunsPageHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('pipeline-runs.html')


class ManagePageHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('manage.html')


class ApiFileListHandler(BaseHandler):
    def get(self):
        self.write(dict(files=[File.get_all_files(get_repo_path())]))

    def post(self):
        data = json.loads(self.request.body).get('file', {})
        file = File.create(data.get('name'), data.get('dir_path'), get_repo_path())
        self.write(dict(file=file.to_dict()))


class ApiFileContentHandler(BaseHandler):
    def get(self, file_path_encoded):
        file_path = urllib.parse.unquote(file_path_encoded)
        file = File.from_path(file_path, get_repo_path())

        self.write(dict(file_content=file.to_dict(include_content=True)))

    def put(self, file_path_encoded):
        file_path = urllib.parse.unquote(file_path_encoded)
        file = File.from_path(file_path, get_repo_path())

        data = json.loads(self.request.body).get('file_content', {})
        content = data.get('content')
        if content is None:
            raise Exception('Please provide a \'content\' param in the request payload.')
        file.update_content(content)

        self.write(dict(file_content=file.to_dict(include_content=True)))


class ApiPipelineHandler(BaseHandler):
    def delete(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        response = dict(pipeline=pipeline.to_dict())
        pipeline.delete()
        self.write(response)

    def get(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        include_content = self.get_bool_argument('include_content', True)
        include_outputs = self.get_bool_argument('include_outputs', True)
        switch_active_kernel(PIPELINE_TO_KERNEL_NAME[pipeline.type])
        self.write(
            dict(
                pipeline=pipeline.to_dict(
                    include_content=include_content,
                    include_outputs=include_outputs,
                    sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
                )
            )
        )
        self.finish()

    @safe_db_query
    def put(self, pipeline_uuid):
        """
        Allow updating pipeline name, uuid, status
        """
        pipeline = Pipeline.get(pipeline_uuid)
        update_content = self.get_bool_argument('update_content', False)
        data = json.loads(self.request.body).get('pipeline', {})
        pipeline.update(data, update_content=update_content)
        switch_active_kernel(PIPELINE_TO_KERNEL_NAME[pipeline.type])

        status = data.get('status')
        if status and status in [
            PipelineSchedule.ScheduleStatus.ACTIVE.value,
            PipelineSchedule.ScheduleStatus.INACTIVE.value,
        ]:
            schedules = (
                PipelineSchedule.
                query.
                filter(PipelineSchedule.pipeline_uuid == pipeline_uuid)
            ).all()
            for schedule in schedules:
                schedule.update(status=status)

        resp = dict(
            pipeline=pipeline.to_dict(
                include_content=update_content,
                include_outputs=update_content,
                sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
            )
        )
        self.write(resp)


class ApiPipelineExecuteHandler(BaseHandler):
    def post(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)

        global_vars = None
        if len(self.request.body) != 0:
            global_vars = json.loads(self.request.body).get('global_vars')

        asyncio.run(pipeline.execute(global_vars=global_vars))
        self.write(
            dict(
                pipeline=pipeline.to_dict(
                    include_outputs=True,
                    sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
                )
            )
        )
        self.finish()


class ApiPipelineListHandler(BaseHandler):
    @safe_db_query
    def get(self):
        include_schedules = self.get_argument('include_schedules', False)

        pipeline_uuids = Pipeline.get_all_pipelines(get_repo_path())
        pipelines = []
        for uuid in pipeline_uuids:
            try:
                pipeline = Pipeline.get(uuid)
                pipelines.append(pipeline)
            except Exception:
                pass

        mapping = {}
        if include_schedules:
            a = aliased(PipelineSchedule, name='a')
            result = (
                PipelineSchedule.
                select(*[
                    a.created_at,
                    a.id,
                    a.name,
                    a.pipeline_uuid,
                    a.schedule_interval,
                    a.schedule_type,
                    a.start_time,
                    a.status,
                    a.updated_at,
                ]).
                filter(a.pipeline_uuid.in_(pipeline_uuids))
            ).all()
            mapping = group_by(lambda x: x.pipeline_uuid, result)

        collection = []
        for pipeline in pipelines:
            schedules = []
            if mapping.get(pipeline.uuid):
                schedules = mapping[pipeline.uuid]
            collection.append(merge_dict(
                pipeline.to_dict(),
                dict(schedules=schedules),
            ))

        self.write(dict(pipelines=collection))
        self.finish()

    def post(self):
        pipeline = json.loads(self.request.body).get('pipeline', {})
        clone_pipeline_uuid = pipeline.get('clone_pipeline_uuid')
        name = pipeline.get('name')
        pipeline_type = pipeline.get('type')
        if clone_pipeline_uuid is None:
            pipeline = Pipeline.create(
                name,
                pipeline_type=pipeline_type,
                repo_path=get_repo_path(),
            )
        else:
            source = Pipeline.get(clone_pipeline_uuid)
            pipeline = Pipeline.duplicate(source, name)
        self.write(dict(pipeline=pipeline.to_dict()))


class ApiPipelineVariableListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        # Get global variables from project's path
        variable_manager = VariableManager(variables_dir=get_variables_dir())

        def get_variable_value(block_uuid, variable_uuid):
            variable = variable_manager.get_variable_object(pipeline_uuid, block_uuid, variable_uuid)
            if variable.variable_type in [VariableType.DATAFRAME, VariableType.GEO_DATAFRAME]:
                value = 'DataFrame'
                variable_type = 'pandas.DataFrame'
            else:
                value = variable.read_data()
                variable_type = str(type(value))
            return dict(
                uuid=variable_uuid,
                type=variable_type,
                value=value,
            )

        variables_dict = variable_manager.get_variables_by_pipeline(pipeline_uuid)
        variables = [
            dict(
                block=dict(uuid=uuid),
                pipeline=dict(uuid=pipeline_uuid),
                variables=[
                            get_variable_value(uuid, var) for var in arr
                            # Not return printed outputs
                            if var == 'df' or var.startswith('output') or uuid == 'global'
                          ],
            )
            for uuid, arr in variables_dict.items()
        ]

        self.write(dict(variables=variables))
        self.finish()

    def post(self, pipeline_uuid):
        variable = json.loads(self.request.body).get('variable', {})
        variable_uuid = variable.get('name')
        if not variable_uuid.isidentifier():
            raise Exception(f'Invalid variable name syntax for variable name {variable_uuid}')
        variable_value = variable.get('value')
        if variable_value is None:
            raise Exception(f'Value is empty for variable name {variable_uuid}')

        set_global_variable(
            pipeline_uuid,
            variable_uuid,
            variable_value,
        )

        # Get global variables from project's path
        variables_dict = VariableManager(
            variables_dir=get_variables_dir(),
        ).get_variables_by_pipeline(pipeline_uuid)
        variables = [
            dict(
                block=dict(uuid=uuid),
                pipeline=dict(uuid=pipeline_uuid),
                variables=arr,
            )
            for uuid, arr in variables_dict.items()
        ]
        self.write(dict(variables=variables))
        self.finish()


class ApiPipelineVariableDetailHandler(BaseHandler):
    def delete(self, pipeline_uuid, variable_uuid):
        delete_global_variable(pipeline_uuid, variable_uuid)

        self.write(dict(variable=variable_uuid))
        self.finish()


class ApiSchedulerHandler(BaseHandler):
    def get(self, action_type=None):
        self.write(dict(scheduler=dict(status=scheduler_manager.get_status())))

    def post(self, action_type):
        if action_type == 'start':
            scheduler_manager.start_scheduler()
        elif action_type == 'stop':
            scheduler_manager.stop_scheduler()
        self.write(dict(scheduler=dict(status=scheduler_manager.get_status())))


class KernelsHandler(BaseHandler):
    def get(self, kernel_id=None):
        kernels = []

        for kernel_name in KernelName:
            kernel = kernel_managers[kernel_name]
            if kernel.has_kernel:
                kernels.append(
                    dict(
                        alive=kernel.is_alive(),
                        id=kernel.kernel_id,
                        name=kernel.kernel_name,
                    )
                )

        r = json.dumps(dict(kernels=kernels))
        self.write(r)

    def post(self, kernel_id, action_type):
        kernel_name = self.get_argument('kernel_name', DEFAULT_KERNEL_NAME)
        if kernel_name not in kernel_managers:
            kernel_name = DEFAULT_KERNEL_NAME
        switch_active_kernel(kernel_name)
        if 'interrupt' == action_type:
            interrupt_kernel()
        elif 'restart' == action_type:
            try:
                restart_kernel()
            except RuntimeError as e:
                # RuntimeError: Cannot restart the kernel. No previous call to 'start_kernel'.
                if 'start_kernel' in str(e):
                    start_kernel()

        r = json.dumps(
            dict(
                kernel=dict(
                    id=kernel_id,
                ),
            )
        )
        self.write(r)
        self.finish()


class ApiStatusHandler(BaseHandler):
    def get(self):
        instance_type = None
        if os.getenv(ECS_CLUSTER_NAME):
            instance_type = 'ecs'
        elif os.getenv(GCP_PROJECT_ID):
            instance_type = 'cloud_run'

        status = {
            'is_instance_manager': os.getenv(MANAGE_ENV_VAR) == '1',
            'repo_path': get_repo_path(),
            'scheduler_status': scheduler_manager.get_status(),
            'instance_type': instance_type,
        }
        self.write(dict(status=status))


def make_app():
    routes = [
        (r'/', MainPageHandler),
        (r'/pipelines', MainPageHandler),
        (r'/pipelines/(.*)', MainPageHandler),
        (r'/pipeline-runs', PipelineRunsPageHandler),
        (r'/terminal', MainPageHandler),
        (r'/manage', ManagePageHandler),
        (
            r'/_next/static/(.*)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(os.path.dirname(__file__), 'frontend_dist/_next/static')},
        ),
        (
            r'/fonts/(.*)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(os.path.dirname(__file__), 'frontend_dist/fonts')},
        ),
        (
            r'/images/(.*)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(os.path.dirname(__file__), 'frontend_dist/images')},
        ),
        (
            r'/(favicon.ico)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(os.path.dirname(__file__), 'frontend_dist')},
        ),
        (r'/websocket/', WebSocketServer),
        (r'/api/event_rules/(?P<provider>\w+)', ApiAwsEventRuleListHandler),
        (r'/api/blocks/(?P<block_type_and_uuid_encoded>.+)', ApiBlockHandler),
        (r'/api/block_runs/(?P<block_run_id>\w+)', ApiBlockRunDetailHandler),
        (r'/api/block_runs/(?P<block_run_id>\w+)/outputs', ApiBlockRunOutputHandler),
        (r'/api/block_runs/(?P<block_run_id>\w+)/logs', ApiBlockRunLogHandler),
        (r'/api/clusters/(?P<cluster_type>\w+)', ApiClustersHandler),
        (r'/api/clusters/(?P<cluster_type>\w+)/instances', ApiInstancesHandler),
        (r'/api/clusters/(?P<cluster_type>\w+)/instances/(?P<instance_name>\w+)', ApiInstanceDetailHandler),
        (r'/api/events', ApiEventHandler),
        (r'/api/event_matchers', ApiEventMatcherListHandler),
        (r'/api/event_matchers/(?P<event_matcher_id>\w+)', ApiEventMatcherDetailHandler),
        (r'/api/files', ApiFileListHandler),
        (r'/api/file_contents/(?P<file_path_encoded>.+)', ApiFileContentHandler),
        (r'/api/monitor_stats/(?P<stats_type>\w+)', ApiMonitorStatsHandler),
        (r'/api/pipelines/(?P<pipeline_uuid>\w+)/execute', ApiPipelineExecuteHandler),
        (r'/api/pipelines/(?P<pipeline_uuid>\w+)', ApiPipelineHandler),
        (r'/api/pipelines', ApiPipelineListHandler),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/execute',
            ApiPipelineBlockExecuteHandler,
        ),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)',
            ApiPipelineBlockHandler,
        ),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/analyses',
            ApiPipelineBlockAnalysisHandler,
        ),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/outputs',
            ApiPipelineBlockOutputHandler,
        ),
        (r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks', ApiPipelineBlockListHandler),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/pipeline_schedules',
            ApiPipelineScheduleListHandler,
        ),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/variables/(?P<variable_uuid>\w+)',
            ApiPipelineVariableDetailHandler,
        ),
        (r'/api/pipelines/(?P<pipeline_uuid>\w+)/variables', ApiPipelineVariableListHandler),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/widgets/(?P<block_uuid>\w+)',
            ApiPipelineWidgetDetailHandler,
        ),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/widgets',
            ApiPipelineWidgetListHandler,
        ),
        (
            r'/api/pipeline_runs/(?P<pipeline_run_id>\w+)',
            ApiPipelineRunDetailHandler,
        ),
        (
            r'/api/pipeline_runs/(?P<pipeline_run_id>\w+)/block_runs',
            ApiBlockRunListHandler,
        ),
        (
            r'/api/block_runs',
            ApiAllBlockRunListHandler,
        ),
        (r'/api/pipeline_runs/(?P<pipeline_run_id>\w+)/logs', ApiPipelineRunLogHandler),
        (
            r'/api/pipeline_schedules',
            ApiPipelineScheduleListHandler,
        ),
        (
            r'/api/pipeline_schedules/(?P<pipeline_schedule_id>\w+)',
            ApiPipelineScheduleDetailHandler,
        ),
        (
            r'/api/pipeline_schedules/(?P<pipeline_schedule_id>\w+)/pipeline_runs',
            ApiPipelineRunListHandler,
        ),
        (
            r'/api/pipeline_runs',
            ApiAllPipelineRunListHandler,
        ),
        (
            r'/api/scheduler/(?P<action_type>[\w\-]*)', ApiSchedulerHandler,
        ),
        (r'/api/kernels', KernelsHandler),
        (r'/api/kernels/(?P<kernel_id>[\w\-]*)/(?P<action_type>[\w\-]*)', KernelsHandler),
        (r'/api/autocomplete_items', ApiAutocompleteItemsHandler),
        (r'/api/data_providers', ApiDataProvidersHandler),
        (r'/api/integration_destinations', ApiIntegrationDestinationsHandler),
        (r'/api/integration_source_streams/(?P<pipeline_uuid>\w+)', ApiIntegrationSourceStreamHandler),
        (r'/api/integration_sources', ApiIntegrationSourcesHandler),
        (r'/api/integration_sources/(?P<pipeline_uuid>\w+)', ApiIntegrationSourceHandler),
        (r'/api/projects', ApiProjectsHandler),
        (r'/api/pipelines/(?P<pipeline_uuid>\w+)/logs', ApiPipelineLogListHandler),
        (r'/api/status', ApiStatusHandler),
    ]
    autoreload.add_reload_hook(scheduler_manager.stop_scheduler)
    return tornado.web.Application(
        routes,
        autoreload=True,
        template_path=os.path.join(os.path.dirname(__file__), 'frontend_dist'),
    )


async def main(
    host: str = None,
    port: str = None,
    project: str = None,
):
    switch_active_kernel(DEFAULT_KERNEL_NAME)

    app = make_app()

    def is_port_in_use(port: int) -> bool:
        print(f'Checking port {port}...')
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0

    port = int(port)
    max_port = port + 100
    while is_port_in_use(port):
        if port > max_port:
            raise Exception(
                'Unable to find an open port, please clear your running processes if possible.'
            )
        port += 1

    app.listen(
        port,
        address=host,
    )

    print(f'Mage is running at http://{host or "localhost"}:{port} and serving project {project}')

    db_connection.start_session(force=True)

    get_messages(
        lambda content: WebSocketServer.send_message(
            parse_output_message(content),
        ),
    )

    await asyncio.Event().wait()


def start_server(
    host: str = None,
    port: str = None,
    project: str = None,
    manage: bool = False,
    dbt_docs: bool = False,
):

    host = host if host else None
    port = port if port else DATA_PREP_SERVER_PORT
    project = project if project else None

    # Set project path in environment variable
    if project:
        project = project = os.path.abspath(project)
    else:
        project = os.path.join(os.getcwd(), 'default_repo')

    if not os.path.exists(project):
        init_repo(project)
    set_repo_path(project)

    if dbt_docs:
        run_docs_server()
    else:
        if manage:
            os.environ[MANAGE_ENV_VAR] = '1'
        else:
            # Start a subprocess for scheduler
            scheduler_manager.start_scheduler()

        enable_pretty_logging()

        # Start web server
        asyncio.run(
            main(
                host=host,
                port=port,
                project=project,
            )
        )


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', type=str, default=None)
    parser.add_argument('--port', type=str, default=None)
    parser.add_argument('--project', type=str, default=None)
    parser.add_argument('--manage-instance', type=str, default='0')
    parser.add_argument('--dbt-docs-instance', type=str, default='0')
    args = parser.parse_args()

    host = args.host
    port = args.port
    project = args.project
    manage = args.manage_instance == '1'
    dbt_docs = args.dbt_docs_instance == '1'

    start_server(
        host=host,
        port=port,
        project=project,
        manage=manage,
        dbt_docs=dbt_docs,
    )
