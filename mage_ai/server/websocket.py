from datetime import datetime
from jupyter_client import KernelManager
from jupyter_client.session import Session
from mage_ai.data_preparation.models.block import BlockType
from mage_ai.data_preparation.models.constants import (
    CUSTOM_EXECUTION_BLOCK_TYPES,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.server.utils.output_display import add_internal_output_info, add_execution_code
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
import asyncio
import json
import os
import pandas as pd
import simplejson
import tornado.websocket
import traceback


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

    def on_message(self, raw_message):
        message = json.loads(raw_message)
        custom_code = message.get('code')
        output = message.get('output')
        global_vars = message.get('global_vars')
        run_upstream = message.get('run_upstream')

        if custom_code:
            block_uuid = message.get('uuid')
            pipeline_uuid = message.get('pipeline_uuid')

            connection_file = os.getenv('CONNECTION_FILE')
            with open(connection_file) as f:
                connection = json.loads(f.read())

            session = Session(key=bytes())
            manager = KernelManager(**connection, session=session)
            client = manager.client()

            pipeline = Pipeline(pipeline_uuid, get_repo_path())
            block = pipeline.get_block(block_uuid)
            code = custom_code
            if block is not None and block.type in CUSTOM_EXECUTION_BLOCK_TYPES:
                code = add_execution_code(
                    pipeline_uuid,
                    block_uuid,
                    custom_code,
                    global_vars,
                    run_upstream=run_upstream,
                )

            msg_id = client.execute(add_internal_output_info(code))

            value = dict(
                block_uuid=block_uuid,
            )

            WebSocketServer.running_executions_mapping[msg_id] = value
        elif output:
            self.send_message(output)

    @classmethod
    def send_message(self, message: dict) -> None:
        msg_id = message['msg_id']
        msg_id_value = WebSocketServer.running_executions_mapping[msg_id]
        uuid = msg_id_value['block_uuid']

        output_dict = dict(uuid=uuid)

        message_final = merge_dict(
            message,
            output_dict,
        )

        print(
            f'[{uuid}] Sending message for {msg_id} to '
            f'{len(self.clients)} client(s): {message_final}'
        )

        for client in self.clients:
            client.write_message(json.dumps(message_final))
