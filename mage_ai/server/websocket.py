from jupyter_client import KernelManager
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
from utils.output_display import add_internal_output_info
import asyncio
import json
import os
import pandas as pd
import tornado.websocket

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path

DATAFRAME_OUTPUT_SAMPLE_COUNT = 10

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
        code = message.get('code')
        output = message.get('output')

        if code:
            block_uuid = message.get('uuid')
            pipeline_uuid = message.get('pipeline_uuid')

            connection_file = os.getenv('CONNECTION_FILE')
            with open(connection_file) as f:
                connection = json.loads(f.read())

            manager = KernelManager(**connection)
            client = manager.client()

            pipeline = Pipeline(pipeline_uuid, get_repo_path())
            block = pipeline.get_block(block_uuid)
            block_output = asyncio.run(block.execute(code))

            msg_id = client.execute(add_internal_output_info(code))

            value = dict(
                block_uuid=block_uuid,
                block_output=block_output,
            )

            WebSocketServer.running_executions_mapping[msg_id] = value
        elif output:
            self.send_message(output)

    @classmethod
    def send_message(self, message: dict) -> None:
        msg_id = message['msg_id']
        msg_id_value = WebSocketServer.running_executions_mapping[msg_id]
        uuid = msg_id_value['block_uuid']
        output = msg_id_value['block_output']

        output_dict = dict(uuid=uuid)
        if len(output) > 0:
            df = find(type(output) == pd.DataFrame, output)
            if df.shape[0] > DATAFRAME_OUTPUT_SAMPLE_COUNT:
                df = df.iloc[:DATAFRAME_OUTPUT_SAMPLE_COUNT]
            output_dict['df_out'] = [
                df.columns.to_list(),
                *df.to_numpy().tolist(),
            ]

        print(f'[{uuid}] Sending message {msg_id} to {len(self.clients)} client(s): {message}')

        for client in self.clients:
            client.write_message(json.dumps(merge_dict(
                message,
                output_dict,
            )))

        del WebSocketServer.running_executions_mapping[msg_id]
