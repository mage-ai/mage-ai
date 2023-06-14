import asyncio
import json
import multiprocessing
import os
import re
import traceback
import uuid
from datetime import datetime
from distutils.file_util import copy_file
from typing import Dict, List

import tornado.websocket
from jupyter_client import KernelClient

from mage_ai.api.errors import ApiError
from mage_ai.api.utils import authenticate_client_and_token, has_at_least_editor_role
from mage_ai.data_preparation.models.constants import (
    CUSTOM_EXECUTION_BLOCK_TYPES,
    PIPELINE_CONFIG_FILE,
    PIPELINES_FOLDER,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.orchestration.db.models.oauth import Oauth2Application, Permission
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
from mage_ai.settings import (
    DISABLE_NOTEBOOK_EDIT_ACCESS,
    HIDE_ENV_VAR_VALUES,
    REQUIRE_USER_AUTHENTICATION,
    is_disable_pipeline_edit_access,
)
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
        metadata: Dict[str, str] = dict(),
        msg_type: str = 'stream_pipeline',
    ):
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
        add_pipeline_message(f'Pipeline {pipeline.uuid} execution failed with error:',
                             metadata=metadata)
        add_pipeline_message(trace, execution_state='idle', metadata=metadata)

    if pipeline.type == PipelineType.PYTHON:
        delete_pipeline_copy_config(config_copy_path)


def publish_pipeline_message(
    message: str,
    execution_state: str = 'busy',
    metadata: Dict[str, str] = dict(),
    msg_type: str = 'stream_pipeline',
) -> None:
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

    def on_message(self, raw_message):
        message = json.loads(raw_message)

        api_key = message.get('api_key')
        token = message.get('token')

        pipeline_uuid = message.get('pipeline_uuid')

        if REQUIRE_USER_AUTHENTICATION or DISABLE_NOTEBOOK_EDIT_ACCESS:
            valid = not REQUIRE_USER_AUTHENTICATION

            if api_key and token:
                oauth_client = Oauth2Application.query.filter(
                    Oauth2Application.client_id == api_key,
                ).first()
                if oauth_client:
                    oauth_token, valid = authenticate_client_and_token(oauth_client.id, token)
                    valid = valid and \
                        oauth_token and \
                        oauth_token.user and \
                        has_at_least_editor_role(
                            oauth_token.user,
                            Permission.Entity.PIPELINE,
                            pipeline_uuid,
                        )
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
        pipeline = None
        if pipeline_uuid:
            pipeline = Pipeline.get(pipeline_uuid, get_repo_path())

        # Add default trigger runtime variables so the code can run successfully.
        global_vars = {}
        if pipeline_uuid:
            global_vars = message.get(
                'global_vars',
                get_global_variables(pipeline_uuid),
            )
        global_vars['env'] = ENV_DEV
        if 'execution_date' not in global_vars:
            global_vars['execution_date'] = datetime.now()
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
            self.__execute_block(
                message,
                pipeline,
                kernel_name,
                global_vars,
            )

    @classmethod
    def send_message(self, message: dict) -> None:
        def should_filter_message(message):
            if message.get('data') is None and message.get('error') is None \
                    and message.get('execution_state') is None and message.get('type') is None:
                return True

            try:
                # Filter out messages meant for jupyter widgets that we can't render
                if message.get('msg_type') == 'display_data' and \
                        message.get('data')[0].startswith('FloatProgress'):
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
        if message.get('data') is None and message.get('error') is None \
           and message.get('execution_state') is None and message.get('type') is None:
            return

        if should_filter_message(message):
            return

        message = filter_out_sensitive_data(message)

        execution_metadata = message.get('execution_metadata')
        msg_id_value = execution_metadata if execution_metadata is not None \
            else WebSocketServer.running_executions_mapping.get(msg_id, dict())
        block_type = msg_id_value.get('block_type')
        block_uuid = msg_id_value.get('block_uuid')
        pipeline_uuid = msg_id_value.get('pipeline_uuid')

        error = message.get('error')
        if error:
            message['data'] = self.__format_error(error)

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
                f'{len(self.clients)} client(s):\n{json.dumps(message_final, indent=2)}'
            )

            for client in self.clients:
                client.write_message(json.dumps(message_final))

    def __execute_block(
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
        run_downstream = message.get('run_downstream')
        run_settings = message.get('run_settings')
        run_tests = message.get('run_tests')
        run_upstream = message.get('run_upstream')
        upstream_blocks = message.get('upstream_blocks')

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

        reload_all_repo_modules(custom_code)

        code = custom_code

        client = self.init_kernel_client(kernel_name)

        value = dict(
            block_type=block_type or block.type,
            block_uuid=block_uuid,
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
                code = add_execution_code(
                    pipeline_uuid,
                    block_uuid,
                    custom_code,
                    global_vars,
                    block_type=block_type,
                    extension_uuid=extension_uuid,
                    kernel_name=kernel_name,
                    pipeline_config=pipeline.get_config_from_yaml(),
                    repo_config=get_repo_config().to_dict(remote=remote_execution),
                    run_settings=run_settings,
                    run_tests=run_tests,
                    run_upstream=run_upstream,
                    update_status=False if remote_execution else True,
                    upstream_blocks=upstream_blocks,
                    widget=widget,
                )

            msg_id = client.execute(add_internal_output_info(code))

            WebSocketServer.running_executions_mapping[msg_id] = value

            block_output_process_code = get_block_output_process_code(
                pipeline_uuid,
                block_uuid,
                block_type=block_type,
                kernel_name=kernel_name,
            )
            if block_output_process_code is not None:
                client.execute(block_output_process_code)

            if run_downstream:
                # This will only run downstream blocks that are charts/widgets
                for block in block.downstream_blocks:
                    if BlockType.CHART != block.type:
                        continue

                    self.on_message(json.dumps(dict(
                        api_key=message.get('api_key'),
                        code=block.file.content(),
                        pipeline_uuid=pipeline_uuid,
                        token=message.get('token'),
                        type=block.type,
                        uuid=block.uuid,
                    )))

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
                global_vars=global_vars,
                kernel_name=kernel_name,
                pipeline_config=pipeline.to_dict(include_content=True),
                repo_config=get_repo_config().to_dict(remote=True),
                update_status=False if kernel_name == KernelName.PYSPARK else True,
            )
            client = self.init_kernel_client(kernel_name)
            msg_id = client.execute(code)

            WebSocketServer.running_executions_mapping[msg_id] = dict(
                pipeline_uuid=pipeline_uuid
            )
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
                target=run_pipeline,
                args=(pipeline, config_copy_path, global_vars, queue)
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
                        if execution_state == 'idle' and \
                                metadata.get('block_uuid') is None:
                            loop = False
                            break
                    await asyncio.sleep(0.5)

            task = asyncio.create_task(check_for_messages())
            set_current_message_task(task)

    def __format_error(error: List[str]) -> List[str]:
        initial_regex = r'.*execute_custom_code\(\).*'
        end_regex = r'.*Block.[_a-z]*\(.*'
        initial_idx = 0
        end_idx = 0
        for idx, line in enumerate(error):
            ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
            line_without_ansi = ansi_escape.sub('', line)
            if re.match(initial_regex, line_without_ansi) and not initial_idx:
                initial_idx = idx
            if re.match(end_regex, line_without_ansi):
                end_idx = idx

        try:
            if initial_idx and end_idx:
                return error[:initial_idx - 1] + error[end_idx + 1:]
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
        metadata=dict(),
        msg_type='stream_pipeline',
    ):
        self.queue = queue
        self.block_uuid = block_uuid
        self.execution_state = execution_state
        self.metadata = metadata
        self.msg_type = msg_type

    def write(self, buf):
        for line in buf.rstrip().splitlines():
            self.queue.put(dict(
                message=f'[{self.block_uuid}] {line.rstrip()}',
                execution_state=self.execution_state,
                metadata=self.metadata,
                msg_type=self.msg_type,
            ))
