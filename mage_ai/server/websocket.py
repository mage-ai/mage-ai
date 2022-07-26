from mage_ai.data_preparation.models.constants import (
    BlockType,
    CUSTOM_EXECUTION_BLOCK_TYPES,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME, KernelName
from mage_ai.server.utils.output_display import add_internal_output_info, add_execution_code
from mage_ai.shared.hash import merge_dict
from jupyter_client import KernelClient, KernelManager
from jupyter_client.session import Session
from typing import List
import asyncio
import json
import os
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

    def init_kernel_client(self) -> KernelClient:
        connection_file = os.getenv('CONNECTION_FILE')
        with open(connection_file) as f:
            connection = json.loads(f.read())

        session = Session(key=bytes())
        manager = KernelManager(**connection, session=session)
        return manager.client()

    def on_message(self, raw_message):
        message = json.loads(raw_message)
        custom_code = message.get('code')
        output = message.get('output')
        global_vars = message.get('global_vars')
        execute_pipeline = message.get('execute_pipeline')
        kernel_name = message.get('kernel_name', DEFAULT_KERNEL_NAME)

        run_downstream = message.get('run_downstream')
        run_upstream = message.get('run_upstream')

        if execute_pipeline:
            pipeline_uuid = message.get('pipeline_uuid')
            pipeline = Pipeline(pipeline_uuid, get_repo_path())

            value = dict(
                pipeline_uuid=pipeline_uuid,
            )

            def run_pipeline() -> None:
                def publish_message(message: str or List[str], execution_state: str = 'busy') -> None:
                    msg_id = str(uuid.uuid4())
                    WebSocketServer.running_executions_mapping[msg_id] = value
                    self.send_message(
                        dict(
                            data=message,
                            execution_state=execution_state,
                            msg_id=msg_id,
                            msg_type='stream_pipeline',
                            type=DataType.TEXT_PLAIN,
                        )
                    )
                
                try:
                    asyncio.run(pipeline.execute(log_func=publish_message, redirect_outputs=True))
                    publish_message(f'Pipeline {pipeline.uuid} execution complete.', 'idle')
                except:
                    trace = traceback.format_exc().splitlines()
                    publish_message(f'Pipeline {pipeline.uuid} execution failed with error:')
                    publish_message(trace, 'idle')

            threading.Thread(target=run_pipeline).start()
        elif output:
            self.send_message(output)
        else:
            block_type = message.get('type')
            block_uuid = message.get('uuid')
            pipeline_uuid = message.get('pipeline_uuid')
            widget = BlockType.CHART == block_type

            client = self.init_kernel_client()

            pipeline = Pipeline(pipeline_uuid, get_repo_path())
            block = pipeline.get_block(block_uuid, widget=widget)
            code = custom_code
            if block is not None and block.type in CUSTOM_EXECUTION_BLOCK_TYPES:
                code = add_execution_code(
                    pipeline_uuid,
                    block_uuid,
                    custom_code,
                    global_vars,
                    analyze_outputs=False if kernel_name == KernelName.PYSPARK else True,
                    kernel_name=kernel_name,
                    pipeline_config=pipeline.get_config_from_yaml(),
                    repo_config=get_repo_config().to_dict(),
                    run_upstream=run_upstream,
                    update_status=False if kernel_name == KernelName.PYSPARK else True,
                    widget=widget,
                )
            if kernel_name == KernelName.PYTHON3:
                msg_id = client.execute(add_internal_output_info(code))
            else:
                msg_id = client.execute(code)

            value = dict(
                block_uuid=block_uuid,
                pipeline_uuid=pipeline_uuid,
            )

            WebSocketServer.running_executions_mapping[msg_id] = value

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
        msg_id = message['msg_id']
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
