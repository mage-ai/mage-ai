from datetime import datetime
from jupyter_client import KernelManager
from mage_ai.data_preparation.models.block import BlockType
from mage_ai.data_preparation.models.constants import (
    CUSTOM_EXECUTION_BLOCK_TYPES,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.server.utils.output_display import add_internal_output_info
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
            block_output = []
            error = None
            trace = None
            if block is not None and block.type in CUSTOM_EXECUTION_BLOCK_TYPES:
                try:
                    output = asyncio.run(block.execute(custom_code=code))
                    if len(output) > 0:
                        for out in output:
                            if type(out) == pd.DataFrame \
                                and out.shape[0] > DATAFRAME_SAMPLE_COUNT_PREVIEW:

                                out = out.iloc[:DATAFRAME_SAMPLE_COUNT_PREVIEW]
                            block_output.append(out)
                except Exception as err:
                    error = err
                    trace = traceback.format_exc().splitlines()
                # Run with no code because we still need to send a message
                msg_id = client.execute('')
            else:
                msg_id = client.execute(add_internal_output_info(code))

            value = dict(
                block_uuid=block_uuid,
                block_output=block_output,
                error=error,
                traceback=trace,
            )

            WebSocketServer.running_executions_mapping[msg_id] = value
        elif output:
            self.send_message(output)

    @classmethod
    def send_message(self, message: dict) -> None:
        msg_type = message['msg_type']
        msg_id = message['msg_id']
        msg_id_value = WebSocketServer.running_executions_mapping[msg_id]
        uuid = msg_id_value['block_uuid']
        output = msg_id_value['block_output']
        trace = msg_id_value['traceback']

        output_dict = dict(uuid=uuid)
        if msg_type == 'execute_input':
            if trace is not None:
                output_dict['data'] = trace
                output_dict['type'] = DataType.TEXT
            elif len(output) > 0:
                df = find(lambda val: type(val) == pd.DataFrame, output)
                output_dict['data'] = simplejson.dumps(
                    dict(
                        columns=df.columns.to_list(),
                        rows=df.to_numpy().tolist(),
                    ),
                    default=datetime.isoformat,
                    ignore_nan=True,
                )
                output_dict['type'] = DataType.TABLE

        message_final = merge_dict(
            message,
            output_dict,
        )

        print(f'[{uuid}] Sending message {msg_id} to {len(self.clients)} client(s): {message_final}')

        for client in self.clients:
            client.write_message(json.dumps(message_final))
