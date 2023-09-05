import argparse
import asyncio
import os
import shutil
import stat
import traceback
import webbrowser
from time import sleep
from typing import Union

import tornado.ioloop
import tornado.web
from tornado import autoreload
from tornado.ioloop import PeriodicCallback
from tornado.log import enable_pretty_logging
from tornado.options import options

from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt
from mage_ai.cache.block import BlockCache
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.cache.tag import TagCache
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_project_type,
    get_project_uuid,
    get_variables_dir,
    init_project_uuid,
    init_repo,
)
from mage_ai.data_preparation.shared.constants import MANAGE_ENV_VAR
from mage_ai.data_preparation.sync import GitConfig
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.database_manager import database_manager
from mage_ai.orchestration.db.models.oauth import Oauth2Application, Role, User
from mage_ai.server.active_kernel import switch_active_kernel
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.api.blocks import ApiPipelineBlockAnalysisHandler
from mage_ai.server.api.clusters import ClusterType
from mage_ai.server.api.downloads import ApiDownloadHandler
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
from mage_ai.settings import (
    AUTHENTICATION_MODE,
    LDAP_ADMIN_USERNAME,
    OAUTH2_APPLICATION_CLIENT_ID,
    REQUESTS_BASE_PATH,
    REQUIRE_USER_AUTHENTICATION,
    ROUTES_BASE_PATH,
    SERVER_VERBOSITY,
    SHELL_COMMAND,
    USE_UNIQUE_TERMINAL,
)
from mage_ai.settings.repo import DEFAULT_MAGE_DATA_DIR, get_repo_name, set_repo_path
from mage_ai.shared.constants import InstanceType
from mage_ai.shared.io import chmod
from mage_ai.shared.logger import LoggingLevel
from mage_ai.shared.utils import is_port_in_use
from mage_ai.usage_statistics.logger import UsageStatisticLogger

EXPORTS_FOLDER = 'frontend_dist'
BASE_PATH_EXPORTS_FOLDER = 'frontend_dist_base_path'
BASE_PATH_TEMPLATE_EXPORTS_FOLDER = 'frontend_dist_base_path_template'
BASE_PATH_PLACEHOLDER = 'CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_'

logger = Logger().new_server_logger(__name__)


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
        (r'/', MainPageHandler),
        (r'/files', MainPageHandler),
        (r'/overview', MainPageHandler),
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
            {'path': os.path.join(template_dir, '_next/static')},
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
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>[\w\%2f\.]+)/analyses',
            ApiPipelineBlockAnalysisHandler,
        ),

        # Trigger pipeline via API
        (
            r'/api/pipeline_schedules/(?P<pipeline_schedule_id>\w+)/pipeline_runs/(?P<token>\w+)',
            ApiTriggerPipelineHandler,
        ),

        # Download block output
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/block_outputs/'
            r'(?P<block_uuid>[\w\%2f\.(/.*)?]+)/downloads',
            ApiDownloadHandler,
        ),

        # API v1 routes
        (
            r'/api/status(?:es)?',
            ApiListHandler,
            {'resource': 'statuses', 'bypass_oauth_check': True},
        ),
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
        (r'/files', MainPageHandler),
        (r'/global-data-products', MainPageHandler),
        (r'/global-data-products/(?P<uuid>\w+)', MainPageHandler),
        (r'/templates', MainPageHandler),
        (r'/templates/(?P<uuid>\w+)', MainPageHandler),
        (r'/version-control', MainPageHandler),
    ]

    if update_routes:
        updated_routes = []
        for route in routes:
            if route[0] == r'/':
                updated_routes.append((f'/{ROUTES_BASE_PATH}', *route[1:]))
            else:
                updated_routes.append(
                    (route[0].replace('/', f'/{ROUTES_BASE_PATH}/', 1), *route[1:]))
    else:
        updated_routes = routes

    autoreload.add_reload_hook(scheduler_manager.stop_scheduler)
    return tornado.web.Application(
        updated_routes,
        autoreload=True,
        template_path=template_dir,
    )


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
    if update_routes:
        url = f'{url}/{ROUTES_BASE_PATH}'
    webbrowser.open_new_tab(url)
    logger.info(f'Mage is running at {url} and serving project {project}')

    db_connection.start_session(force=True)

    # Git sync if option is enabled
    preferences = get_preferences()
    if preferences.sync_config:
        sync_config = GitConfig.load(config=preferences.sync_config)
        if sync_config.sync_on_start:
            try:
                sync = GitSync(sync_config)
                sync.sync_data()
                logger.info(
                    f'Successfully synced data from git repo: {sync_config.remote_repo_link}'
                    f', branch: {sync_config.branch}'
                )
            except Exception as err:
                logger.info(
                    f'Failed to sync data from git repo: {sync_config.remote_repo_link}'
                    f', branch: {sync_config.branch} with error: {str(err)}'
                )

    if REQUIRE_USER_AUTHENTICATION:
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
        else:
            Role.create_default_roles()

        # Fetch legacy owner user to check if we need to batch update the users with new roles.
        legacy_owner_user = User.query.filter(User._owner == True).first()  # noqa: E712

        default_owner_role = Role.get_role(Role.DefaultRole.OWNER)
        owner_users = default_owner_role.users if default_owner_role else []
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

    logger.info('Initializing block cache.')
    await BlockCache.initialize_cache(replace=True)

    logger.info('Initializing tag cache.')
    await TagCache.initialize_cache(replace=True)

    logger.info('Initializing block action object cache.')
    await BlockActionObjectCache.initialize_cache(replace=True)

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
    init_project_uuid(overwrite_uuid=project_uuid)

    asyncio.run(UsageStatisticLogger().project_impression())

    if dbt_docs:
        run_docs_server()
    else:
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
            if LoggingLevel.is_valid_level(SERVER_VERBOSITY):
                options.logging = SERVER_VERBOSITY
            enable_pretty_logging()

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
    instance_type = args.instance_type
    project_type = os.getenv('PROJECT_TYPE', ProjectType.STANDALONE)
    cluster_type = os.getenv('CLUSTER_TYPE')

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
