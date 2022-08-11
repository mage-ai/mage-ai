from distutils.dir_util import copy_tree
from mage_ai.data_preparation.models.constants import (
    BlockType,
    CUSTOM_EXECUTION_BLOCK_TYPES,
    PIPELINES_FOLDER,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.server.active_kernel import (
    get_active_kernel_client,
    get_active_kernel_name,
    switch_active_kernel,
)
from mage_ai.server.execution_manager import (
    cancel_pipeline_execution,
    delete_pipeline_copy_config,
    reset_execution_manager,
    set_current_pipeline_process,
    set_previous_config_path,
)
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.server.kernels import KernelName
from mage_ai.server.utils.output_display import (
    add_internal_output_info,
    add_execution_code,
    get_block_output_process_code,
    get_pipeline_execution_code,
)
from mage_ai.shared.hash import merge_dict
from jupyter_client import KernelClient
from typing import Callable, Dict
import json
import multiprocessing
import os
import tornado.websocket
import traceback
import uuid


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
        output = message.get('output')
        if output:
            self.send_message(output)
            return
        global_vars = message.get('global_vars')
        cancel_pipeline = message.get('cancel_pipeline')
        execute_pipeline = message.get('execute_pipeline')
        kernel_name = message.get('kernel_name', get_active_kernel_name())
        block_uuid = message.get('uuid')
        pipeline_uuid = message.get('pipeline_uuid')
        pipeline = Pipeline(pipeline_uuid, get_repo_path())

        global_vars = message.get('global_vars', get_global_variables(pipeline_uuid))

        value = dict(
            block_uuid=block_uuid,
            pipeline_uuid=pipeline_uuid,
        )

        def publish_message(
            message: str,
            execution_state: str = 'busy',
            msg_type: str = 'stream_pipeline',
            block_uuid: str = None,
        ) -> None:
            msg_id = str(uuid.uuid4())
            value['block_uuid'] = block_uuid
            WebSocketServer.running_executions_mapping[msg_id] = value
            self.send_message(
                dict(
                    data=message,
                    execution_state=execution_state,
                    msg_id=msg_id,
                    msg_type=msg_type,
                    type=DataType.TEXT_PLAIN,
                )
            )

        if cancel_pipeline:
            cancel_pipeline_execution(pipeline, publish_message)
        elif execute_pipeline:
            self.__execute_pipeline(
                pipeline,
                kernel_name,
                global_vars,
                publish_message,
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
        msg_id = message.get('msg_id')
        if msg_id is None:
            return
        msg_id_value = WebSocketServer.running_executions_mapping.get(msg_id, dict())
        block_uuid = msg_id_value.get('block_uuid')
        pipeline_uuid = msg_id_value.get('pipeline_uuid')

        output_dict = dict(uuid=block_uuid, pipeline_uuid=pipeline_uuid)

        message_final = merge_dict(
            message,
            output_dict,
        )

        print(
            f'[{block_uuid}] Sending message for {msg_id} to '
            f'{len(self.clients)} client(s): {message_final}'
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
        run_downstream = message.get('run_downstream')
        run_tests = message.get('run_tests')
        run_upstream = message.get('run_upstream')

        pipeline_uuid = pipeline.uuid

        widget = BlockType.CHART == block_type

        block = pipeline.get_block(block_uuid, widget=widget)
        code = custom_code

        client = self.init_kernel_client(kernel_name)

        value = dict(block_uuid=block_uuid)

        if not custom_code and BlockType.SCRATCHPAD == block_type:
            msg_id = client.execute('')

            WebSocketServer.running_executions_mapping[msg_id] = value

            self.send_message(
                dict(
                    data='',
                    execution_state='idle',
                    msg_id=msg_id,
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
                    analyze_outputs=False if remote_execution else True,
                    block_type=block_type,
                    kernel_name=kernel_name,
                    pipeline_config=pipeline.get_config_from_yaml(),
                    repo_config=get_repo_config().to_dict(remote=remote_execution),
                    run_tests=run_tests,
                    run_upstream=run_upstream,
                    update_status=False if remote_execution else True,
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
                for block in block.downstream_blocks:
                    self.on_message(json.dumps(dict(
                        code=block.file.content(),
                        pipeline_uuid=pipeline_uuid,
                        type=block.type,
                        uuid=block.uuid,
                    )))


    def __execute_pipeline(
        self,
        pipeline: Pipeline,
        kernel_name: str,
        global_vars: Dict[str, any],
        publish_message: Callable,
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
                new_pipeline_directory = os.path.join(pipeline.repo_path, PIPELINES_FOLDER, pipeline_copy)
                copy_tree(pipeline.dir_path, new_pipeline_directory)
                set_previous_config_path(new_pipeline_directory)
                return new_pipeline_directory

            config_copy_path = save_pipeline_config()
            
            def run_pipeline() -> None:
                try:
                    pipeline.execute_sync(
                        log_func=publish_message,
                    )
                    publish_message(
                        f'Pipeline {pipeline.uuid} execution complete.\n'
                        'You can see the code block output in the corresponding code block.',
                        execution_state = 'idle',
                    )
                except Exception:
                    trace = traceback.format_exc().splitlines()
                    publish_message(f'Pipeline {pipeline.uuid} execution failed with error:')
                    publish_message(trace, 'idle')

                delete_pipeline_copy_config(config_copy_path)

            reset_execution_manager()

            # The pipeline state can potentially break when the execution is cancelled,
            # so we save the pipeline config before execution if the user cancels the excecution.
            save_pipeline_config()
            proc = multiprocessing.Process(target=run_pipeline)
            proc.start()
            set_current_pipeline_process(proc)
