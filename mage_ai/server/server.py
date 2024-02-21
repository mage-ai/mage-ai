import argparse
import asyncio
import json
import os
import shutil
import stat
import traceback
import webbrowser
from datetime import datetime
from time import sleep
from typing import Optional, Union

import pytz
import tornado.ioloop
import tornado.web
from tornado import autoreload
from tornado.ioloop import PeriodicCallback
from tornado.log import enable_pretty_logging
from tornado.options import options

from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt
from mage_ai.cache.block import BlockCache
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.cache.dbt.cache import DBTCache
from mage_ai.cache.file import FileCache
from mage_ai.cache.pipeline import PipelineCache
from mage_ai.cache.tag import TagCache
from mage_ai.cluster_manager.constants import ClusterType
from mage_ai.cluster_manager.manage import check_auto_termination
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_cluster_type,
    get_project_type,
    get_project_uuid,
    init_project_uuid,
    init_repo,
)
from mage_ai.data_preparation.shared.constants import MANAGE_ENV_VAR
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import db_connection, set_db_schema
from mage_ai.orchestration.db.database_manager import database_manager
from mage_ai.orchestration.db.models.oauth import Oauth2Application, Role, User
from mage_ai.orchestration.utils.distributed_lock import DistributedLock
from mage_ai.server.active_kernel import switch_active_kernel
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.api.blocks import ApiPipelineBlockAnalysisHandler
from mage_ai.server.api.downloads import ApiDownloadHandler, ApiResourceDownloadHandler
from mage_ai.server.api.events import (
    ApiEventHandler,
    ApiEventMatcherDetailHandler,
    ApiEventMatcherListHandler,
)
from mage_ai.server.api.triggers import ApiTriggerPipelineHandler
from mage_ai.server.api.v1 import (
    ApiChildDetailHandler,
    ApiChildListHandler,
    ApiListHandler,
    ApiResourceDetailHandler,
    ApiResourceListHandler,
)
from mage_ai.server.constants import DATA_PREP_SERVER_PORT
from mage_ai.server.docs_server import run_docs_server
from mage_ai.server.kernel_output_parser import parse_output_message
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME
from mage_ai.server.logger import Logger
from mage_ai.server.scheduler_manager import (
    SCHEDULER_AUTO_RESTART_INTERVAL,
    check_scheduler_status,
    scheduler_manager,
)
from mage_ai.server.subscriber import get_messages
from mage_ai.server.terminal_server import (
    MageTermManager,
    MageUniqueTermManager,
    TerminalWebsocketServer,
)
from mage_ai.server.websocket_server import WebSocketServer
from mage_ai.services.redis.redis import init_redis_client
from mage_ai.services.spark.models.applications import Application
from mage_ai.services.ssh.aws.emr.utils import file_path as file_path_aws_emr
from mage_ai.settings import (
    AUTHENTICATION_MODE,
    DISABLE_AUTO_BROWSER_OPEN,
    ENABLE_PROMETHEUS,
    LDAP_ADMIN_USERNAME,
    OAUTH2_APPLICATION_CLIENT_ID,
    OTEL_EXPORTER_OTLP_ENDPOINT,
    REDIS_URL,
    REQUESTS_BASE_PATH,
    REQUIRE_USER_AUTHENTICATION,
    REQUIRE_USER_PERMISSIONS,
    ROUTES_BASE_PATH,
    SERVER_LOGGING_FORMAT,
    SERVER_VERBOSITY,
    SHELL_COMMAND,
    USE_UNIQUE_TERMINAL,
)
from mage_ai.settings.repo import (
    DEFAULT_MAGE_DATA_DIR,
    MAGE_CLUSTER_TYPE_ENV_VAR,
    MAGE_PROJECT_TYPE_ENV_VAR,
    get_repo_name,
    get_variables_dir,
    set_repo_path,
)
from mage_ai.shared.constants import ENV_VAR_INSTANCE_TYPE, InstanceType
from mage_ai.shared.environments import is_debug
from mage_ai.shared.io import chmod
from mage_ai.shared.logger import LoggingLevel, set_logging_format
from mage_ai.shared.utils import is_port_in_use
from mage_ai.usage_statistics.logger import UsageStatisticLogger

EXPORTS_FOLDER = 'frontend_dist'
BASE_PATH_EXPORTS_FOLDER = 'frontend_dist_base_path'
BASE_PATH_TEMPLATE_EXPORTS_FOLDER = 'frontend_dist_base_path_template'
BASE_PATH_PLACEHOLDER = 'CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_'

lock = DistributedLock()
logger = Logger().new_server_logger(__name__)


class ActivityTracker:
    def __init__(self):
        self.latest_activity = None
        self.redis_client = init_redis_client(REDIS_URL)

    def get_latest_activity(self) -> Optional[datetime]:
        if self.redis_client:
            latest_activity_ts = self.redis_client.get('latest_activity')
            if latest_activity_ts:
                return datetime.fromisoformat(latest_activity_ts)
            else:
                return None
        return self.latest_activity

    def update_latest_activity(self) -> None:
        if self.redis_client and lock.try_acquire_lock('activity_tracker', timeout=10):
            self.redis_client.set('latest_activity', datetime.now(tz=pytz.UTC).isoformat())
        else:
            self.latest_activity = datetime.now(tz=pytz.UTC)


latest_user_activity = ActivityTracker()


class MainPageHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        self.render('index.html')


class PipelineRunsPageHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('pipeline-runs.html')


class ManagePageHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('manage.html')


class ApiSchedulerHandler(BaseHandler):
    def get(self, action_type=None):
        self.write(dict(scheduler=dict(status=scheduler_manager.get_status())))

    def post(self, action_type):
        if action_type == 'start':
            scheduler_manager.start_scheduler()
        elif action_type == 'stop':
            scheduler_manager.stop_scheduler()
        self.write(dict(scheduler=dict(status=scheduler_manager.get_status())))


class PrometheusMetricsHandler(BaseHandler):
    def get(self):
        import prometheus_client

        self.set_header('Content-Type', prometheus_client.CONTENT_TYPE_LATEST)
        self.write(prometheus_client.generate_latest(prometheus_client.REGISTRY))


def replace_base_path(base_path: str) -> str:
    """
    This function will create the BASE_PATH_EXPORTS_FOLDER and replace all the
    occurrences of CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_ with the base_path parameter.

    Args:
        base_path (str): The base path to replace the placeholder with.

    Returns:
        str: The path of the frontend static export folder with the replaced base paths.
    """
    src = os.path.join(os.path.dirname(__file__), BASE_PATH_TEMPLATE_EXPORTS_FOLDER)

    directory = get_variables_dir()
    # get_variables_dir can return an s3 path. In that case, use the DEFAULT_MAGE_DATA_DIR
    # directory.
    if directory.startswith('s3'):
        directory = os.path.join(os.path.expanduser(DEFAULT_MAGE_DATA_DIR), get_repo_name())
        os.makedirs(directory, exist_ok=True)
    dst = os.path.join(directory, BASE_PATH_EXPORTS_FOLDER)
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    chmod(dst, stat.S_IRWXU)
    for path, _, files in os.walk(os.path.abspath(dst)):
        for filename in files:
            if filename.endswith(('.html', '.js', '.css')):
                filepath = os.path.join(path, filename)
                with open(filepath, encoding='utf-8') as f:
                    s = f.read()
                s = s.replace(BASE_PATH_PLACEHOLDER, base_path)
                s = s.replace('src:url(/fonts', f'src:url(/{base_path}/fonts')
                s = s.replace('href="/favicon.ico"', f'href="/{base_path}/favicon.ico"')
                # replace favicon
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(s)
    return dst


def make_app(template_dir: str = None, update_routes: bool = False):
    shell_command = SHELL_COMMAND
    if shell_command is None:
        shell_command = 'bash'
        if os.name == 'nt':
            shell_command = 'cmd'
    term_klass = MageTermManager
    if USE_UNIQUE_TERMINAL:
        term_klass = MageUniqueTermManager
    term_manager = term_klass(shell_command=[shell_command])

    if template_dir is None:
        template_dir = os.path.join(os.path.dirname(__file__), EXPORTS_FOLDER)
    routes = [
        (r'/?', MainPageHandler),
        (r'/files', MainPageHandler),
        (r'/overview', MainPageHandler),
        (r'/oauth', MainPageHandler),
        (r'/pipelines', MainPageHandler),
        (r'/pipelines/(.*)', MainPageHandler),
        (r'/pipeline-runs', PipelineRunsPageHandler),
        (r'/settings', MainPageHandler),
        (r'/settings/(.*)', MainPageHandler),
        (r'/sign-in', MainPageHandler),
        (r'/terminal', MainPageHandler),
        (r'/triggers', MainPageHandler),
        (r'/manage', MainPageHandler),
        (r'/manage/(.*)', MainPageHandler),
        (r'/templates', MainPageHandler),
        (r'/version-control', MainPageHandler),
        (
            r'/_next/static/(.*)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(template_dir, '_next', 'static')},
        ),
        (
            r'/fonts/(.*)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(template_dir, 'fonts')},
        ),
        (
            r'/images/(.*)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(template_dir, 'images')},
        ),
        (
            r'/monaco-editor/(.*)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(template_dir, 'monaco-editor')},
        ),
        (
            r'/(favicon.ico)',
            tornado.web.StaticFileHandler,
            {'path': template_dir},
        ),
        (r'/websocket/', WebSocketServer),
        (r'/websocket/terminal', TerminalWebsocketServer, {'term_manager': term_manager}),
        # Not sure what is using this, perhaps the event triggering via Lambda?
        (r'/api/events', ApiEventHandler),
        (r'/api/event_matchers', ApiEventMatcherListHandler),
        (r'/api/event_matchers/(?P<event_matcher_id>\w+)', ApiEventMatcherDetailHandler),
        # TODO: This call is not easily removed from the frontend so will change this
        # in a future PR.
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>[\w\-\%2f\.]+)/analyses',
            ApiPipelineBlockAnalysisHandler,
        ),

        # Trigger pipeline via API
        # Original route for backwards compatibility
        (
            r'/api/pipeline_schedules/(?P<pipeline_schedule_id>\w+)/pipeline_runs/(?P<token>\w+)',
            ApiTriggerPipelineHandler,
        ),
        (
            r'/api/pipeline_schedules/(?P<pipeline_schedule_id>\w+)/api_trigger',
            ApiTriggerPipelineHandler,
        ),

        # Download block output
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/block_outputs/'
            r'(?P<block_uuid>[\w\-\%2f\.(/.*)?]+)/downloads',
            ApiDownloadHandler,
        ),
        # Download resource
        (
            r'/api/downloads/(?P<token>[\w/%.-]+)',
            ApiResourceDownloadHandler
        ),

        # API v1 routes
        (
            r'/api/status(?:es)?',
            ApiListHandler,
            {
                'resource': 'statuses',
                'bypass_oauth_check': True,
                'is_health_check': True,
            },
        ),
        (
            r'/api/(?P<resource>\w+)/(?P<pk>[\w\-\%2f\.]+)' \
            r'/(?P<child>\w+)/(?P<child_pk>[\w\-\%2f\.]+)',
            ApiChildDetailHandler,
        ),
        (
            r'/api/(?P<resource>\w+)/(?P<pk>[\w\-\%2f\.]+)/(?P<child>\w+)',
            ApiChildListHandler,
        ),
        (
            r'/api/(?P<resource>\w+)/(?P<pk>[\w\-\%2f\.]+)',
            ApiResourceDetailHandler,
        ),
        (r'/api/(?P<resource>\w+)', ApiResourceListHandler),
        (r'/api/(?P<resource>\w+)/(?P<pk>.+)', ApiResourceDetailHandler),
        (r'/files', MainPageHandler),
        (r'/global-data-products', MainPageHandler),
        (r'/global-data-products/(?P<uuid>\w+)', MainPageHandler),
        (r'/global-hooks', MainPageHandler),
        (r'/global-hooks/(?P<uuid>[\w\-\%2f\.]+)', MainPageHandler),
        (r'/templates', MainPageHandler),
        (r'/templates/(?P<uuid>[\w\-\%2f\.]+)', MainPageHandler),
        (r'/version-control', MainPageHandler),
    ]

    if ENABLE_PROMETHEUS or OTEL_EXPORTER_OTLP_ENDPOINT:
        from opentelemetry.instrumentation.tornado import TornadoInstrumentor
        TornadoInstrumentor().instrument()
        logger.info('OpenTelemetry instrumentation enabled.')

    if OTEL_EXPORTER_OTLP_ENDPOINT:
        logger.info(f'OTEL_EXPORTER_OTLP_ENDPOINT: {OTEL_EXPORTER_OTLP_ENDPOINT}')

        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        service_name = "mage-ai-server"
        resource = Resource(attributes={
            "service.name": service_name,
        })

        # Set up a TracerProvider and attach an OTLP exporter to it
        trace.set_tracer_provider(TracerProvider(resource=resource))
        tracer_provider = trace.get_tracer_provider()

        # Configure OTLP exporter
        otlp_exporter = OTLPSpanExporter(
            # Endpoint of your OpenTelemetry Collector
            endpoint=OTEL_EXPORTER_OTLP_ENDPOINT,
            # Use insecure channel if your collector does not support TLS
            insecure=True
        )

        # Attach the OTLP exporter to the TracerProvider
        span_processor = BatchSpanProcessor(otlp_exporter)
        tracer_provider.add_span_processor(span_processor)

    if ENABLE_PROMETHEUS:
        from opentelemetry import metrics
        from opentelemetry.exporter.prometheus import PrometheusMetricReader
        from opentelemetry.instrumentation.tornado import TornadoInstrumentor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.resources import SERVICE_NAME, Resource

        TornadoInstrumentor().instrument()
        # Service name is required for most backends
        resource = Resource(attributes={
            SERVICE_NAME: 'mage'
        })

        # Initialize PrometheusMetricReader which pulls metrics from the SDK
        # on-demand to respond to scrape requests
        reader = PrometheusMetricReader()
        provider = MeterProvider(resource=resource, metric_readers=[reader])
        metrics.set_meter_provider(provider)
        routes += [(r'/metrics', PrometheusMetricsHandler)]

    if update_routes:
        updated_routes = []
        for route in routes:
            updated_routes.append(
                (route[0].replace('/', f'/{ROUTES_BASE_PATH}/', 1), *route[1:]))
    else:
        updated_routes = routes

    autoreload.add_reload_hook(scheduler_manager.stop_scheduler)

    file_path = file_path_aws_emr()
    if not os.path.exists(file_path):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w') as f:
            f.write(json.dumps({}))

    autoreload.watch(file_path)

    return tornado.web.Application(
        updated_routes,
        autoreload=True,
        template_path=template_dir,
    )


def initialize_user_authentication(project_type: ProjectType) -> Oauth2Application:
    logger.info('User authentication is enabled.')
    # We need to sleep for a few seconds after creating all the tables or else there
    # may be an error trying to create users.
    sleep(5)

    # Create new roles on existing users. This should only need to be run once.
    if project_type == ProjectType.SUB:
        Role.create_default_roles(
            entity=Entity.PROJECT,
            entity_id=get_project_uuid(),
            prefix=get_repo_name(),
        )
        default_owner_role = Role.get_role(f'{get_repo_name()}_{Role.DefaultRole.OWNER}')
    else:
        Role.create_default_roles()
        default_owner_role = Role.get_role(Role.DefaultRole.OWNER)

    # Fetch legacy owner user to check if we need to batch update the users with new roles.
    legacy_owner_user = User.query.filter(User._owner == True).first()  # noqa: E712
    global_owner_role = Role.get_role(Role.DefaultRole.OWNER)
    owner_users = global_owner_role.users if global_owner_role else []
    if not legacy_owner_user and len(owner_users) == 0:
        logger.info('User with owner permission doesn’t exist, creating owner user.')
        if AUTHENTICATION_MODE.lower() == 'ldap':
            user = User.create(
                roles_new=[default_owner_role],
                username=LDAP_ADMIN_USERNAME,
            )
        else:
            password_salt = generate_salt()
            user = User.create(
                email='admin@admin.com',
                password_hash=create_bcrypt_hash('admin', password_salt),
                password_salt=password_salt,
                roles_new=[default_owner_role],
                username='admin',
            )
        owner_user = user
    else:
        if legacy_owner_user and not legacy_owner_user.roles_new:
            User.batch_update_user_roles()
        owner_user = next(iter(owner_users), None) or legacy_owner_user

    oauth_client = Oauth2Application.query.filter(
        Oauth2Application.client_id == OAUTH2_APPLICATION_CLIENT_ID,
    ).first()
    if not oauth_client:
        logger.info(
            'OAuth2 application doesn’t exist for frontend, creating OAuth2 application.')
        oauth_client = Oauth2Application.create(
            client_id=OAUTH2_APPLICATION_CLIENT_ID,
            client_type=Oauth2Application.ClientType.PUBLIC,
            name='frontend',
            user_id=owner_user.id,
        )

    return oauth_client


async def main(
    host: Union[str, None] = None,
    port: Union[str, None] = None,
    project: Union[str, None] = None,
    project_type: ProjectType = ProjectType.STANDALONE,
):
    switch_active_kernel(DEFAULT_KERNEL_NAME)

    # Update base path if environment variable is set
    update_routes = False
    template_dir = None
    if REQUESTS_BASE_PATH or ROUTES_BASE_PATH:
        try:
            if REQUESTS_BASE_PATH:
                template_dir = replace_base_path(REQUESTS_BASE_PATH)
            if ROUTES_BASE_PATH:
                update_routes = True
        except Exception:
            logger.warning(
                'Server failed to replace base path with error:\n%s',
                traceback.format_exc(),
            )
            logger.warning('Continuing with default routes...')

    app = make_app(
        template_dir=template_dir,
        update_routes=update_routes,
    )

    port = int(port)
    max_port = port + 100
    try:
        while is_port_in_use(port, host=host):
            if port > max_port:
                raise Exception(
                    'Unable to find an open port, please clear your running processes if possible.'
                )
            port += 1
    except OSError:
        logger.error(f'Socket error while trying to find an open port. Defaulting to port {port}')

    app.listen(
        port,
        address=host if host != 'localhost' else None,
    )

    host = host or 'localhost'
    url = f'http://{host}:{port}'
    if update_routes:
        url = f'{url}/{ROUTES_BASE_PATH}'

    if not DISABLE_AUTO_BROWSER_OPEN:
        webbrowser.open_new_tab(url)
    logger.info(f'Mage is running at {url} and serving project {project}')

    db_connection.start_session(force=True)
    latest_user_activity.update_latest_activity()

    # Git sync if option is enabled
    preferences = get_preferences()
    if preferences.sync_config:
        try:
            from mage_ai.data_preparation.sync import GitConfig
            from mage_ai.data_preparation.sync.git_sync import GitSync
            sync_config = GitConfig.load(config=preferences.sync_config)
            sync = GitSync(sync_config, setup_repo=True)
            if sync_config.sync_on_start:
                try:
                    sync.sync_data()
                    logger.info(
                        f'Successfully synced data from git repo: {sync_config.remote_repo_link}'
                        f', branch: {sync_config.branch}'
                    )
                except Exception:
                    logger.exception(
                        f'Failed to sync data from git repo: {sync_config.remote_repo_link}'
                        f', branch: {sync_config.branch}'
                    )
        except Exception:
            logger.exception('Failed to set up git repo')

    if REQUIRE_USER_AUTHENTICATION:
        initialize_user_authentication(project_type)

    if REQUIRE_USER_PERMISSIONS:
        logger.info('User permissions requirement is enabled.')

    try:
        logger.info('Initializing block cache.')
        logger.info('Initializing pipeline cache.')
        await BlockCache.initialize_cache(replace=True, caches=[PipelineCache])
    except Exception as err:
        print(f'[ERROR] PipelineCache.initialize_cache: {err}.')
        if is_debug():
            raise err

    logger.info('Initializing tag cache.')
    await TagCache.initialize_cache(replace=True)

    logger.info('Initializing block action object cache.')
    await BlockActionObjectCache.initialize_cache(replace=True)

    project_model = Project(root_project=True)
    if project_model:
        if project_model.spark_config and \
                project_model.is_feature_enabled(FeatureUUID.COMPUTE_MANAGEMENT):

            Application.clear_cache()

        if project_model.is_feature_enabled(FeatureUUID.DBT_V2):
            try:
                logger.info('Initializing dbt cache.')
                dbt_cache = await DBTCache.initialize_cache_async(replace=True, root_project=True)
                logger.info(f'dbt cached in {dbt_cache.file_path}')
            except Exception as err:
                print(f'[ERROR] DBTCache.initialize_cache: {err}.')
                if is_debug():
                    raise err

        if project_model.is_feature_enabled(FeatureUUID.COMMAND_CENTER):
            try:
                logger.info('Initializing file cache.')
                file_cache = FileCache.initialize_cache_with_settings(replace=True)
                count = len(file_cache._temp_data) if file_cache._temp_data else 0
                logger.info(
                    f'{count} files cached in {file_cache.file_path}.',
                )
            except Exception as err:
                print(f'[ERROR] FileCache.initialize_cache_with_settings: {err}.')
                if is_debug():
                    raise err

    try:
        from mage_ai.services.ssh.aws.emr.models import create_tunnel

        tunnel = create_tunnel(clean_up_on_failure=True)
        if tunnel:
            print(f'SSH tunnel active: {tunnel.is_active()}')
    except Exception as err:
        print(f'[WARNING] SSH tunnel failed to create and connect: {err}')

    # Check scheduler status periodically
    periodic_callback = PeriodicCallback(
        check_scheduler_status,
        SCHEDULER_AUTO_RESTART_INTERVAL,
    )
    periodic_callback.start()

    if ProjectType.MAIN == project_type:
        # Check scheduler status periodically
        auto_termination_callback = PeriodicCallback(
            lambda: check_auto_termination(get_cluster_type()),
            60_000,
        )
        auto_termination_callback.start()

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
    instance_type: InstanceType = InstanceType.SERVER_AND_SCHEDULER,
    project_type: ProjectType = ProjectType.STANDALONE,
    cluster_type: ClusterType = None,
    project_uuid: str = None,
):
    host = host if host else None
    port = port if port else DATA_PREP_SERVER_PORT
    project = project if project else None

    # Set project path in environment variable
    if project:
        project = os.path.abspath(project)
    else:
        project = os.path.join(os.getcwd(), 'default_repo')

    if not os.path.exists(project):
        init_repo(
            project,
            project_type=project_type,
            cluster_type=cluster_type,
            project_uuid=project_uuid,
        )
    set_repo_path(project)
    init_project_uuid(overwrite_uuid=project_uuid, root_project=True)

    asyncio.run(UsageStatisticLogger().project_impression())

    set_logging_format(
        logging_format=SERVER_LOGGING_FORMAT,
        level=SERVER_VERBOSITY,
    )

    if LoggingLevel.is_valid_level(SERVER_VERBOSITY):
        options.logging = SERVER_VERBOSITY
    enable_pretty_logging()

    if dbt_docs:
        run_docs_server()
    else:
        set_db_schema()
        run_web_server = True
        project_type = get_project_type()
        if manage or project_type == ProjectType.MAIN:
            os.environ[MANAGE_ENV_VAR] = '1'
            # run migrations to enable user authentication
            try:
                database_manager.run_migrations()
            except Exception:
                traceback.print_exc()
        elif instance_type == InstanceType.SERVER_AND_SCHEDULER:
            # Start a subprocess for scheduler
            scheduler_manager.start_scheduler()
        elif instance_type == InstanceType.SCHEDULER:
            # Start a subprocess for scheduler
            scheduler_manager.start_scheduler(foreground=True)
            run_web_server = False
        elif instance_type == InstanceType.WEB_SERVER:
            # run migrations to enable user authentication
            try:
                database_manager.run_migrations()
            except Exception:
                traceback.print_exc()

        if run_web_server:
            # Start web server
            asyncio.run(
                main(
                    host=host,
                    port=port,
                    project=project,
                    project_type=project_type,
                )
            )


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', type=str, default=None)
    parser.add_argument('--port', type=str, default=None)
    parser.add_argument('--project', type=str, default=None)
    parser.add_argument('--manage-instance', type=str, default='0')
    parser.add_argument('--dbt-docs-instance', type=str, default='0')
    parser.add_argument('--instance-type', type=str, default='server_and_scheduler')
    args = parser.parse_args()

    host = args.host
    port = args.port
    project = args.project
    manage = args.manage_instance == '1'
    dbt_docs = args.dbt_docs_instance == '1'
    instance_type = os.getenv(ENV_VAR_INSTANCE_TYPE, args.instance_type)
    project_type = os.getenv(MAGE_PROJECT_TYPE_ENV_VAR, ProjectType.STANDALONE)
    cluster_type = os.getenv(MAGE_CLUSTER_TYPE_ENV_VAR)

    start_server(
        host=host,
        port=port,
        project=project,
        manage=manage,
        dbt_docs=dbt_docs,
        instance_type=instance_type,
        project_type=project_type,
        cluster_type=cluster_type,
    )
