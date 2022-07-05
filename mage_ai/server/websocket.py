from jupyter_client import KernelManager
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
from utils.output_display import add_internal_output_info
import json
import os
import tornado.websocket


class WebSocketServer(tornado.websocket.WebSocketHandler):
    """Simple WebSocket handler to serve clients."""

    # Note that `clients` is a class variable and `send_message` is a
    # classmethod.
    clients = set()
    running_executions_mapping = set()

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

            msg_id = client.execute(add_internal_output_info(code))

            WebSocketServer.running_executions_mapping.add((msg_id, block_uuid))
        elif output:
            self.send_message(output)

    @classmethod
    def send_message(self, message: dict) -> None:
        msg_id = message['msg_id']
        msg_id_uuid_tuple = find(
            lambda tup: tup[0] == msg_id,
            list(WebSocketServer.running_executions_mapping),
        )
        uuid = msg_id_uuid_tuple[1]

        print(f'[{uuid}] Sending message {msg_id} to {len(self.clients)} client(s): {message}')

        for client in self.clients:
            client.write_message(json.dumps(merge_dict(
                message,
                dict(uuid=uuid),
            )))
