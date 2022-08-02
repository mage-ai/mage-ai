from mage_ai.data_preparation.models.constants import (
    BlockType,
    CUSTOM_EXECUTION_BLOCK_TYPES,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.server.active_kernel import (
    get_active_kernel_client,
    get_active_kernel_name,
    switch_active_kernel,
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
import asyncio
import json
import threading
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
        custom_code = message.get('code')
        output = message.get('output')
        if output:
            self.send_message(output)
            return
        global_vars = message.get('global_vars')
        execute_pipeline = message.get('execute_pipeline')
        kernel_name = message.get('kernel_name', get_active_kernel_name())

        run_downstream = message.get('run_downstream')
        run_upstream = message.get('run_upstream')
        run_tests = message.get('run_tests')
        block_type = message.get('type')
        block_uuid = message.get('uuid')
        pipeline_uuid = message.get('pipeline_uuid')
        pipeline = Pipeline(pipeline_uuid, get_repo_path())


        value = dict(
            block_uuid=block_uuid,
            pipeline_uuid=pipeline_uuid,
        )

        def publish_message(
            message: str,
            execution_state: str = 'busy',
            msg_type: str = 'stream_pipeline',
        ) -> None:
            msg_id = str(uuid.uuid4())
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

        if execute_pipeline:
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

                WebSocketServer.running_executions_mapping[msg_id] = value
            else:
                def run_pipeline() -> None:
                    try:
                        asyncio.run(pipeline.execute(log_func=publish_message, redirect_outputs=True))
                        publish_message(f'Pipeline {pipeline.uuid} execution complete.', 'idle')
                    except Exception:
                        trace = traceback.format_exc().splitlines()
                        publish_message(f'Pipeline {pipeline.uuid} execution failed with error:')
                        publish_message(trace, 'idle')

                threading.Thread(target=run_pipeline).start()
        else:
            widget = BlockType.CHART == block_type

            block = pipeline.get_block(block_uuid, widget=widget)
            code = custom_code

            client = self.init_kernel_client(kernel_name)

            if not custom_code and BlockType.SCRATCHPAD == block_type:
                msg_id = client.execute('')

                value = dict(
                    block_uuid=block_uuid,
                    pipeline_uuid=pipeline_uuid,
                )
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

                WebSocketServer.running_executions_mapping[msg_id] = dict(
                    block_uuid=block_uuid,
                    pipeline_uuid=pipeline_uuid,
                )

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
