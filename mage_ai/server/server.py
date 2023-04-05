from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import (
    get_repo_path,
    init_repo,
    set_repo_path,
)
from mage_ai.data_preparation.shared.constants import MANAGE_ENV_VAR
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.models.oauth import Oauth2Application, User
from mage_ai.server.active_kernel import switch_active_kernel
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.api.blocks import (
    ApiPipelineBlockAnalysisHandler,
    ApiPipelineBlockExecuteHandler,
    ApiPipelineBlockOutputHandler,
)
from mage_ai.server.api.clusters import (
    ApiInstanceDetailHandler,
    ApiInstancesHandler,
    ClusterType,
)
from mage_ai.server.api.events import (
    ApiEventHandler,
    ApiEventMatcherDetailHandler,
    ApiEventMatcherListHandler,
)
from mage_ai.server.api.triggers import ApiTriggerPipelineHandler
from mage_ai.server.api.v1 import (
    ApiChildDetailHandler,
    ApiChildListHandler,
    ApiResourceDetailHandler,
    ApiResourceListHandler,
)
from mage_ai.server.constants import DATA_PREP_SERVER_PORT
from mage_ai.server.docs_server import run_docs_server
from mage_ai.server.kernel_output_parser import parse_output_message
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME
from mage_ai.server.scheduler_manager import (
    SCHEDULER_AUTO_RESTART_INTERVAL,
    check_scheduler_status,
    scheduler_manager,
)
from mage_ai.server.subscriber import get_messages
from mage_ai.server.terminal_server import TerminalWebsocketServer
from mage_ai.server.websocket_server import WebSocketServer
from mage_ai.settings import (
    OAUTH2_APPLICATION_CLIENT_ID,
    REQUIRE_USER_AUTHENTICATION,
    AUTHENTICATION_MODE,
    LDAP_ADMIN_USERNAME,
    SERVER_VERBOSITY
)
from mage_ai.shared.logger import LoggingLevel
from mage_ai.shared.utils import is_port_in_use
from tornado import autoreload
from tornado.ioloop import PeriodicCallback
from tornado.log import enable_pretty_logging
from tornado.options import options
from typing import Union
import argparse
import asyncio
import json
import os
import terminado
import tornado.ioloop
import tornado.web
import webbrowser


class MainPageHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('index.html')


class PipelineRunsPageHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('pipeline-runs.html')


class ManagePageHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('manage.html')


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


class ApiSchedulerHandler(BaseHandler):
    def get(self, action_type=None):
        self.write(dict(scheduler=dict(status=scheduler_manager.get_status())))

    def post(self, action_type):
        if action_type == 'start':
            scheduler_manager.start_scheduler()
        elif action_type == 'stop':
            scheduler_manager.stop_scheduler()
        self.write(dict(scheduler=dict(status=scheduler_manager.get_status())))


class ApiStatusHandler(BaseHandler):
    def get(self):
        from mage_ai.cluster_manager.constants import (
            ECS_CLUSTER_NAME,
            GCP_PROJECT_ID,
            KUBE_NAMESPACE,
        )

        instance_type = None
        if os.getenv(ECS_CLUSTER_NAME):
            instance_type = ClusterType.ECS
        elif os.getenv(GCP_PROJECT_ID):
            instance_type = ClusterType.CLOUD_RUN
        else:
            try:
                from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager
                if WorkloadManager.load_config() or os.getenv(KUBE_NAMESPACE):
                    instance_type = ClusterType.K8S
            except ModuleNotFoundError:
                pass

        status = {
            'is_instance_manager': os.getenv(MANAGE_ENV_VAR) == '1',
            'repo_path': get_repo_path(),
            'scheduler_status': scheduler_manager.get_status(),
            'instance_type': instance_type,
        }
        self.write(dict(status=status))


class ApiProjectSettingsHandler(BaseHandler):
    def get(self):
        self.write(dict(project_settings=[
            dict(require_user_authentication=REQUIRE_USER_AUTHENTICATION),
        ]))


def make_app():
    term_manager = terminado.NamedTermManager(shell_command=['bash'])
    routes = [
        (r'/', MainPageHandler),
        (r'/pipelines', MainPageHandler),
        (r'/pipelines/(.*)', MainPageHandler),
        (r'/pipeline-runs', PipelineRunsPageHandler),
        (r'/settings', MainPageHandler),
        (r'/settings/(.*)', MainPageHandler),
        (r'/sign-in', MainPageHandler),
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
        (r'/websocket/terminal', TerminalWebsocketServer, {'term_manager': term_manager}),
        # These are hard to test until we do a full Docker build and deploy to cloud
        (r'/api/clusters/(?P<cluster_type>\w+)/instances', ApiInstancesHandler),
        (
            r'/api/clusters/(?P<cluster_type>\w+)/instances/(?P<instance_name>\w+)',
            ApiInstanceDetailHandler,
        ),

        # Not sure what is using this, perhaps the event triggering via Lambda?
        (r'/api/events', ApiEventHandler),
        (r'/api/event_matchers', ApiEventMatcherListHandler),
        (r'/api/event_matchers/(?P<event_matcher_id>\w+)', ApiEventMatcherDetailHandler),

        # Where is this used?
        (r'/api/pipelines/(?P<pipeline_uuid>\w+)/execute', ApiPipelineExecuteHandler),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>[\w\%2f\.]+)/execute',
            ApiPipelineBlockExecuteHandler,
        ),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>[\w\%2f\.]+)/analyses',
            ApiPipelineBlockAnalysisHandler,
        ),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>[\w\%2f\.]+)/outputs',
            ApiPipelineBlockOutputHandler,
        ),

        # Trigger pipeline via API
        (
            r'/api/pipeline_schedules/(?P<pipeline_schedule_id>\w+)/pipeline_runs/(?P<token>\w+)',
            ApiTriggerPipelineHandler,
        ),

        # Status
        (r'/api/status', ApiStatusHandler),

        # This is used to check scheduler status and manually fix it
        (r'/api/scheduler/(?P<action_type>[\w\-]*)', ApiSchedulerHandler),

        (r'/api/project_settings', ApiProjectSettingsHandler),

        # API v1 routes
        (
            r'/api/(?P<resource>\w+)/(?P<pk>[\w\%2f\.]+)/(?P<child>\w+)/(?P<child_pk>[\w\%2f\.]+)',
            ApiChildDetailHandler,
        ),
        (
            r'/api/(?P<resource>\w+)/(?P<pk>[\w\%2f\.]+)/(?P<child>\w+)',
            ApiChildListHandler,
        ),
        (
            r'/api/(?P<resource>\w+)/(?P<pk>[\w\%2f\.]+)',
            ApiResourceDetailHandler,
        ),
        (r'/api/(?P<resource>\w+)', ApiResourceListHandler),
        (r'/api/(?P<resource>\w+)/(?P<pk>.+)', ApiResourceDetailHandler),
    ]
    autoreload.add_reload_hook(scheduler_manager.stop_scheduler)
    return tornado.web.Application(
        routes,
        autoreload=True,
        template_path=os.path.join(os.path.dirname(__file__), 'frontend_dist'),
    )


async def main(
    host: Union[str, None] = None,
    port: Union[str, None] = None,
    project: Union[str, None] = None,
):
    switch_active_kernel(DEFAULT_KERNEL_NAME)

    app = make_app()

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
        address=host if host != 'localhost' else None,
    )

    url = f'http://{host or "localhost"}:{port}'
    webbrowser.open_new_tab(url)
    print(f'Mage is running at {url} and serving project {project}')

    db_connection.start_session(force=True)

    if REQUIRE_USER_AUTHENTICATION:
        print('User authentication is enabled.')
        user = User.query.filter(User.owner == True).first()  # noqa: E712
        if not user:
            print('User with owner permission doesn’t exist, creating owner user.')
            if AUTHENTICATION_MODE.lower() == 'ldap':
                user = User.create(
                    owner=True,
                    username=LDAP_ADMIN_USERNAME,
                )
            else:
                password_salt = generate_salt()
                user = User.create(
                    email='admin@admin.com',
                    password_hash=create_bcrypt_hash('admin', password_salt),
                    password_salt=password_salt,
                    owner=True,
                    username='admin',
                )

        oauth_client = Oauth2Application.query.filter(
            Oauth2Application.client_id == OAUTH2_APPLICATION_CLIENT_ID,
        ).first()
        if not oauth_client:
            print('OAuth2 application doesn’t exist for frontend, creating OAuth2 application.')
            oauth_client = Oauth2Application.create(
                client_id=OAUTH2_APPLICATION_CLIENT_ID,
                client_type=Oauth2Application.ClientType.PUBLIC,
                name='frontend',
                user_id=user.id,
            )

    # Check scheduler status periodically
    periodic_callback = PeriodicCallback(
        check_scheduler_status,
        SCHEDULER_AUTO_RESTART_INTERVAL,
    )
    periodic_callback.start()

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

        if LoggingLevel.is_valid_level(SERVER_VERBOSITY):
            options.logging = SERVER_VERBOSITY
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
