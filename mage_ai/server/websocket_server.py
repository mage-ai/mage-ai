import asyncio
import base64
import json
import multiprocessing
import os
import re
import traceback
import uuid
from datetime import datetime, timedelta
from distutils.file_util import copy_file
from typing import Dict, List

import simplejson
import tornado.websocket
from jupyter_client import KernelClient

from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.resources.PipelineResource import PipelineResource
from mage_ai.api.resources.ProjectResource import ProjectResource
from mage_ai.api.utils import authenticate_client_and_token
from mage_ai.data_preparation.models.constants import (
    CUSTOM_EXECUTION_BLOCK_TYPES,
    PIPELINE_CONFIG_FILE,
    PIPELINES_FOLDER,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.orchestration.db.models.oauth import Oauth2Application
from mage_ai.server.active_kernel import (
    get_active_kernel_client,
    get_active_kernel_name,
    switch_active_kernel,
)
from mage_ai.server.execution_manager import (
    cancel_pipeline_execution,
    check_pipeline_process_status,
    delete_pipeline_copy_config,
    reset_execution_manager,
    set_current_message_task,
    set_current_pipeline_process,
    set_previous_config_path,
)
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME, KernelName
from mage_ai.server.logger import Logger
from mage_ai.server.utils.output_display import (
    add_execution_code,
    add_internal_output_info,
    get_block_output_process_code,
    get_pipeline_execution_code,
)
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.settings import (
    DISABLE_NOTEBOOK_EDIT_ACCESS,
    HIDE_ENV_VAR_VALUES,
    REQUIRE_USER_AUTHENTICATION,
    is_disable_pipeline_edit_access,
)
from mage_ai.settings.platform import project_platform_activated
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.constants import ENV_DEV
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.security import filter_out_env_var_values
from mage_ai.utils.code import reload_all_repo_modules

logger = Logger().new_server_logger(__name__)


def run_pipeline(
    pipeline: Pipeline,
    config_copy_path: str,
    global_vars: Dict[str, any],
    queue: multiprocessing.Queue,
) -> None:
    """
    Execute pipeline synchronously. This function is meant to be run in a separate process,
    and will write status messages to the passed in multiprocessing queue.
    """
    metadata = dict(
        pipeline_uuid=pipeline.uuid,
    )

    def add_pipeline_message(
        message: str,
        execution_state: str = 'busy',
        metadata: Dict[str, str] = None,
        msg_type: str = 'stream_pipeline',
    ):
        if metadata is None:
            metadata = dict()
        msg = dict(
            message=message,
            execution_state=execution_state,
            metadata=metadata,
            msg_type=msg_type,
        )
        queue.put(msg)

    def build_block_output_stdout(
        block_uuid: str,
        execution_state: str = 'busy',
    ):
        return StreamBlockOutputToQueue(
            queue,
            block_uuid,
            execution_state=execution_state,
            metadata=dict(
                block_uuid=block_uuid,
                pipeline_uuid=pipeline.uuid,
            ),
        )

    try:
        pipeline.execute_sync(
            global_vars=global_vars,
            build_block_output_stdout=build_block_output_stdout,
            retry_config=dict(),
            run_sensors=False,
        )
        add_pipeline_message(
            f'Pipeline {pipeline.uuid} execution complete.\n'
            'You can see the code block output in the corresponding code block.',
            execution_state='idle',
            metadata=metadata,
        )
    except Exception:
        trace = traceback.format_exc().splitlines()
        add_pipeline_message(
            f'Pipeline {pipeline.uuid} execution failed with error:', metadata=metadata
        )
        add_pipeline_message(trace, execution_state='idle', metadata=metadata)

    if pipeline.type == PipelineType.PYTHON:
        delete_pipeline_copy_config(config_copy_path)


def publish_pipeline_message(
    message: str,
    execution_state: str = 'busy',
    metadata: Dict[str, str] = None,
    msg_type: str = 'stream_pipeline',
) -> None:
    if metadata is None:
        metadata = dict()
    msg_id = str(uuid.uuid4())
    WebSocketServer.send_message(
        dict(
            data=message,
            execution_metadata=metadata,
            execution_state=execution_state,
            msg_id=msg_id,
            msg_type=msg_type,
            type=DataType.TEXT_PLAIN,
        )
    )


class WebSocketServer(tornado.websocket.WebSocketHandler):
    """Simple WebSocket handler to serve clients."""

    # Note that `clients` is a class variable and `send_message` is a
    # classmethod.
    clients = set()
    running_executions_mapping = dict()

    def open(self):
        WebSocketServer.clients.add(self)

    def on_close(self):
        WebSocketServer.clients.remove(self)

    def check_origin(self, origin):
        return True

    def init_kernel_client(self, kernel_name) -> KernelClient:
        if kernel_name != get_active_kernel_name():
            switch_active_kernel(kernel_name)

        return get_active_kernel_client()

    async def on_message(self, raw_message):
        message = json.loads(raw_message)

        api_key = message.get('api_key')
        token = message.get('token')

        pipeline_uuid = message.get('pipeline_uuid')
        oauth_client, oauth_token, user = None, None, None

        if api_key and token:
            oauth_client = Oauth2Application.query.filter(
                Oauth2Application.client_id == api_key,
            ).first()
            if oauth_client:
                oauth_token, _ = authenticate_client_and_token(oauth_client.id, token)
                if oauth_token:
                    user = oauth_token.user

        repo_path = get_repo_path(user=user)
        pipeline = None
        if pipeline_uuid:
            pipeline = Pipeline.get(
                pipeline_uuid,
                all_projects=project_platform_activated(),
                repo_path=repo_path,
                use_repo_path=True,
            )

        if REQUIRE_USER_AUTHENTICATION or DISABLE_NOTEBOOK_EDIT_ACCESS:
            valid = not REQUIRE_USER_AUTHENTICATION

            if oauth_client:
                valid = (oauth_token is not None) and oauth_token.is_valid()
                if valid and oauth_token and user:
                    try:
                        if pipeline_uuid:
                            await PipelineResource.policy_class()(
                                PipelineResource(
                                    pipeline,
                                    user,
                                ),
                                user,
                            ).authorize_action(action=OperationType.UPDATE)
                        else:
                            await ProjectResource.policy_class()(
                                ProjectResource(
                                    {},
                                    user,
                                ),
                                user,
                            ).authorize_action(action=OperationType.UPDATE)
                        valid = True
                    except ApiError as err:
                        print(f'[WARNING] WebSocketServer.on_message: {err}.')
                        valid = False

            if not valid or DISABLE_NOTEBOOK_EDIT_ACCESS == 1:
                return self.send_message(
                    dict(
                        data=ApiError.UNAUTHORIZED_ACCESS['message'],
                        execution_metadata=dict(block_uuid=message.get('uuid')),
                        execution_state='idle',
                        msg_id=str(uuid.uuid4()),
                        type=DataType.TEXT_PLAIN,
                    ),
                )

        output = message.get('output')
        if output:
            self.send_message(output)
            return
        global_vars = message.get('global_vars')
        cancel_pipeline = message.get('cancel_pipeline')
        skip_publish_message = message.get('skip_publish_message')
        execute_pipeline = message.get('execute_pipeline')
        check_if_pipeline_running = message.get('check_if_pipeline_running')
        kernel_name = message.get('kernel_name', get_active_kernel_name())

        # Add default trigger runtime variables so the code can run successfully.
        global_vars = {}
        if pipeline_uuid:
            global_vars = message.get(
                'global_vars',
                get_global_variables(pipeline_uuid),
            )
        global_vars['env'] = ENV_DEV
        if 'execution_date' not in global_vars:
            now = datetime.now()
            global_vars['execution_date'] = now
            global_vars['interval_end_datetime'] = now + timedelta(days=1)
            global_vars['interval_seconds'] = None
            global_vars['interval_start_datetime'] = now
            global_vars['interval_start_datetime_previous'] = None

        global_vars['event'] = dict()

        if cancel_pipeline:
            cancel_pipeline_execution(
                pipeline,
                publish_pipeline_message,
                skip_publish_message,
            )
        elif check_if_pipeline_running:
            check_pipeline_process_status(pipeline, publish_pipeline_message)
        elif not pipeline:
            code = message.get('code')
            # Need to use Python magic command for changing directories
            code = re.sub(r'^!%cd|^!cd', '%cd', code)

            client = self.init_kernel_client(DEFAULT_KERNEL_NAME)
            msg_id = client.execute(code)
            value = dict(block_uuid=message.get('uuid'))
            WebSocketServer.running_executions_mapping[msg_id] = value
        elif execute_pipeline:
            self.__execute_pipeline(
                pipeline,
                kernel_name,
                global_vars,
            )
        else:
            await self.__execute_block(
                message,
                pipeline,
                kernel_name,
                global_vars,
            )

    @classmethod
    def send_message(cls, message: dict) -> None:
        def should_filter_message(message):
            if (
                message.get('data') is None
                and message.get('error') is None
                and message.get('execution_state') is None
                and message.get('type') is None
            ):
                return True

            try:
                # Filter out messages meant for jupyter widgets that we can't render
                if message.get('msg_type') == 'display_data' and message.get('data')[0].startswith(
                    'FloatProgress'
                ):
                    return True
            except IndexError:
                pass

            return False

        def filter_out_sensitive_data(message):
            if not message.get('data') or not HIDE_ENV_VAR_VALUES:
                return message
            data = message['data']
            if type(data) is str:
                data = [data]
            data = [filter_out_env_var_values(data_value) for data_value in data]
            message['data'] = data
            return message

        msg_id = message.get('msg_id')
        if msg_id is None:
            return
        if (
            message.get('data') is None
            and message.get('error') is None
            and message.get('execution_state') is None
            and message.get('type') is None
        ):
            return

        if should_filter_message(message):
            return

        message = filter_out_sensitive_data(message)

        execution_metadata = message.get('execution_metadata')
        msg_id_value = (
            execution_metadata
            if execution_metadata is not None
            else WebSocketServer.running_executions_mapping.get(msg_id, dict())
        )
        block_type = msg_id_value.get('block_type')
        block_uuid = msg_id_value.get('block_uuid')
        replicated_block = msg_id_value.get('replicated_block')
        pipeline_uuid = msg_id_value.get('pipeline_uuid')

        error = message.get('error')
        if error:
            message['data'] = cls.format_error(
                error,
                block_uuid=replicated_block if replicated_block else block_uuid,
            )

        output_dict = dict(
            block_type=block_type,
            pipeline_uuid=pipeline_uuid,
            uuid=block_uuid,
        )

        message_final = merge_dict(
            message,
            output_dict,
        )

        # KernelResource: when getting a kernel,
        # it will trigger this send_message from the WebSocket subscriber.
        # This log message is unnecessary and publishing to clients is also unnecessary.
        if block_uuid or pipeline_uuid:
            logger.info(
                f'[{block_uuid}] Sending message for {msg_id} to '
                f'{len(cls.clients)} client(s):\n{json.dumps(message_final, indent=2)}'
            )

            for client in cls.clients:
                client.write_message(json.dumps(message_final))

    async def __execute_block(
        self,
        message: Dict[str, any],
        pipeline: Pipeline,
        kernel_name: str,
        global_vars: Dict[str, any],
    ) -> None:
        block_type = message.get('type')
        block_uuid = message.get('uuid')
        custom_code = message.get('code')
        extension_uuid = message.get('extension_uuid')
        output_messages_to_logs = message.get('output_messages_to_logs', False)
        run_downstream = message.get('run_downstream')
        run_incomplete_upstream = message.get('run_incomplete_upstream')
        run_settings = message.get('run_settings')
        run_tests = message.get('run_tests')
        run_upstream = message.get('run_upstream')
        upstream_blocks = message.get('upstream_blocks')

        variables = message.get('variables') or None

        pipeline_uuid = pipeline.uuid

        widget = BlockType.CHART == block_type

        block = pipeline.get_block(
            block_uuid,
            block_type=block_type,
            extension_uuid=extension_uuid,
            widget=widget,
        )

        # Execute saved block content when pipeline edits are disabled
        if is_disable_pipeline_edit_access():
            custom_code = block.content

        code = custom_code

        client = self.init_kernel_client(kernel_name)

        reload_all_repo_modules(custom_code, client)

        value = dict(
            block_type=block_type or block.type,
            block_uuid=block_uuid,
            replicated_block=block.replicated_block,
        )

        if not custom_code and BlockType.SCRATCHPAD == block_type:
            self.send_message(
                dict(
                    data='',
                    execution_metadata=value,
                    execution_state='idle',
                    msg_id=str(uuid.uuid4()),
                    type=DataType.TEXT_PLAIN,
                ),
            )
        else:
            if block is not None and block.type in CUSTOM_EXECUTION_BLOCK_TYPES:
                if kernel_name == KernelName.PYSPARK and not widget:
                    remote_execution = True
                else:
                    remote_execution = False

                execution_uuid = None
                # Need to cache everything here
                if (
                    block.should_track_spark()
                    and ComputeServiceUUID.AWS_EMR == block.compute_service_uuid
                ):
                    execution_uuid = str(uuid.uuid4()).split('-')[0]
                    block.clear_spark_jobs_cache()
                    block.cache_spark_application()
                    block.set_spark_job_execution_start(execution_uuid=execution_uuid)

                pipeline_config = pipeline.get_config_from_yaml()
                repo_config = pipeline.repo_config.to_dict(remote=remote_execution)

                code = add_execution_code(
                    pipeline_uuid,
                    block_uuid,
                    custom_code,
                    global_vars,
                    pipeline.repo_path,
                    block_type=block_type,
                    execution_uuid=execution_uuid,
                    extension_uuid=extension_uuid,
                    kernel_name=kernel_name,
                    output_messages_to_logs=output_messages_to_logs,
                    pipeline_config=pipeline_config,
                    pipeline_config_json_encoded=base64.b64encode(
                        simplejson.dumps(pipeline_config).encode()
                    ).decode(),
                    repo_config=repo_config,
                    repo_config_json_encoded=base64.b64encode(
                        simplejson.dumps(repo_config).encode()
                    ).decode(),
                    # repo_config=get_repo_config().to_dict(remote=remote_execution),
                    run_incomplete_upstream=run_incomplete_upstream,
                    # The UI can execute a block and send run_settings to control the behavior
                    # of the block run while executing it from the notebook.
                    # E.G.
                    # run_settings = dict(selected_streams=[
                    #     'account_v2',
                    #     'user_with_emails',
                    # ])
                    run_settings=run_settings,
                    run_tests=run_tests,
                    run_upstream=run_upstream,
                    update_status=False if remote_execution else True,
                    upstream_blocks=upstream_blocks,
                    variables=variables,
                    widget=widget,
                )
            elif BlockType.SCRATCHPAD == block_type:
                # Initialize the db_connection session if it hasn't been initialized yet.
                initialize_db_connection = """
from mage_ai.orchestration.db import db_connection
db_connection.start_session()
"""
                client.execute(initialize_db_connection)

            msg_id = client.execute(
                add_internal_output_info(
                    block,
                    code,
                    extension_uuid=extension_uuid,
                    widget=widget,
                )
            )

            WebSocketServer.running_executions_mapping[msg_id] = value

            block_output_process_code = get_block_output_process_code(
                pipeline_uuid,
                block_uuid,
                pipeline.repo_path,
                block_type=block_type,
                kernel_name=kernel_name,
            )
            if block_output_process_code is not None:
                client.execute(block_output_process_code)

            if run_downstream:
                # This will only run downstream blocks that are charts/widgets
                for downstream_block in block.downstream_blocks:
                    if BlockType.CHART != downstream_block.type:
                        continue

                    await self.on_message(
                        json.dumps(
                            dict(
                                api_key=message.get('api_key'),
                                code=downstream_block.file.content(),
                                pipeline_uuid=pipeline_uuid,
                                token=message.get('token'),
                                type=downstream_block.type,
                                uuid=downstream_block.uuid,
                            )
                        )
                    )

    def __execute_pipeline(
        self,
        pipeline: Pipeline,
        kernel_name: str,
        global_vars: Dict[str, any],
    ) -> None:
        pipeline_uuid = pipeline.uuid

        if kernel_name == KernelName.PYSPARK:
            code = get_pipeline_execution_code(
                pipeline_uuid,
                pipeline.repo_path,
                global_vars=global_vars,
                kernel_name=kernel_name,
                pipeline_config=pipeline.to_dict(include_content=True),
                repo_config=get_repo_config().to_dict(remote=True),
                update_status=False if kernel_name == KernelName.PYSPARK else True,
            )
            client = self.init_kernel_client(kernel_name)
            msg_id = client.execute(code)

            WebSocketServer.running_executions_mapping[msg_id] = dict(pipeline_uuid=pipeline_uuid)
        else:
            # TODO: save config for other kernel types.
            def save_pipeline_config() -> str:
                pipeline_copy = f'{pipeline.uuid}_{str(uuid.uuid4())}'
                new_pipeline_directory = os.path.join(
                    pipeline.repo_path,
                    PIPELINES_FOLDER,
                    pipeline_copy,
                )
                os.makedirs(new_pipeline_directory, exist_ok=True)
                copy_file(
                    os.path.join(pipeline.dir_path, PIPELINE_CONFIG_FILE),
                    os.path.join(new_pipeline_directory, PIPELINE_CONFIG_FILE),
                )
                set_previous_config_path(new_pipeline_directory)
                return new_pipeline_directory

            reset_execution_manager()

            if pipeline.type == PipelineType.PYTHON:
                publish_pipeline_message(
                    'Saving current pipeline config for backup. This may take some time...',
                    metadata=dict(pipeline_uuid=pipeline_uuid),
                )

                # The pipeline state can potentially break when the execution is cancelled,
                # so we save the pipeline config before execution if the user cancels the
                # excecution.
                config_copy_path = save_pipeline_config()
            else:
                config_copy_path = None

            queue = multiprocessing.Queue()
            proc = multiprocessing.Process(
                target=run_pipeline, args=(pipeline, config_copy_path, global_vars, queue)
            )
            proc.start()
            set_current_pipeline_process(proc)

            async def check_for_messages():
                loop = True
                while loop:
                    while not queue.empty():
                        msg = queue.get()
                        metadata = msg.get('metadata')
                        execution_state = msg.get('execution_state')
                        publish_pipeline_message(
                            msg.get('message'),
                            execution_state=execution_state,
                            metadata=metadata,
                            msg_type=msg.get('msg_type'),
                        )
                        if execution_state == 'idle' and metadata.get('block_uuid') is None:
                            loop = False
                            break
                    await asyncio.sleep(0.5)

            task = asyncio.create_task(check_for_messages())
            set_current_message_task(task)

    @classmethod
    def format_error(cls, error: List[str], block_uuid: str = None) -> List[str]:
        """
        Most errors that are returned from executed code will contain sections that are not
        useful to the user because they will contain internal Mage method calls. The point
        of this method is to remove those unnecessary lines and replace hard-to-read font with
        more visible font.

        The `initial_regex` pattern is used to find the start of the Mage method calls within the
        error message. When a block is executed from a notebook, the start of the traceback will be
        when the `execute_custom_code` method is called from the ipython kernel.

        The `end_regex` pattern is used to find the end of the Mage method calls. If a block UUID
        is provided, we will try to find the end by searching for the block UUID because the block
        code should be executed within the `{block_uuid}.py` file. Otherwise, we will default to
        using `execute_block_function` which is a method called when a block is executed.

        The `custom_block_end_regex` pattern is used as a fallback if the `end_regex` pattern cannot
        be found. If a block is not a standard Python block, this fallback regex will be used.

        All the lines in the error between the initial_idx and end_idx (or custom_block_end_idx)
        will be filtered out in the return value.

        Args:
            error (List[str]): The list of strings representing the error message, where each
                element corresponds to a line of the error message.
            block_uuid (str, optional): The UUID of the block to identify the end of the specific
                block within the error message. If not provided, the method will use the default
                'execute_block_function' string to search for the end of the block.

        Returns:
            List[str]: A formatted error message with unnecessary lines removed and hard-to-read
                font replaced, making it more user-friendly.
        """
        initial_regex = r'.*execute_custom_code\(\).*'
        end_search_string = block_uuid if block_uuid else 'execute_block_function'
        end_regex = r'.*' + re.escape(end_search_string) + r'.*'
        custom_block_end_regex = r'.*data_preparation\/models\/block.*'

        initial_idx = 0
        end_idx = 0
        custom_block_end_idx = 0
        for idx, line in enumerate(error):
            ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
            line_without_ansi = ansi_escape.sub('', line)
            # The "execute_custom_code" method may appear in multiple lines of the stack trace, so
            # we just want to fetch the index of the first occurrence.
            if re.match(initial_regex, line_without_ansi) and not initial_idx:
                initial_idx = idx
            if re.match(end_regex, line_without_ansi):
                end_idx = idx
            if re.match(custom_block_end_regex, line_without_ansi):
                custom_block_end_idx = idx

        # Replace hard-to-read dark blue font with yellow font
        error = [e.replace('[0;34m', '[0;33m') for e in error]

        try:
            if initial_idx and end_idx:
                return error[: initial_idx - 1] + error[end_idx:]
            elif initial_idx and custom_block_end_idx:
                return error[: initial_idx - 1] + error[custom_block_end_idx:]
        except Exception:
            pass

        return error


class StreamBlockOutputToQueue(object):
    """
    Fake file-like stream object that redirects block output to a queue
    to be streamed to the websocket.
    """

    def __init__(
        self,
        queue,
        block_uuid,
        execution_state='busy',
        metadata=None,
        msg_type='stream_pipeline',
    ):
        self.queue = queue
        self.block_uuid = block_uuid
        self.execution_state = execution_state
        if metadata is None:
            metadata = dict()
        self.metadata = metadata
        self.msg_type = msg_type

    def write(self, buf):
        for line in buf.rstrip().splitlines():
            self.queue.put(
                dict(
                    message=f'[{self.block_uuid}] {line.rstrip()}',
                    execution_state=self.execution_state,
                    metadata=self.metadata,
                    msg_type=self.msg_type,
                )
            )
