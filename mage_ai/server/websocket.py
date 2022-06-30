from jupyter_client import KernelManager
from mage_ai.data_cleaner.shared.array import find
from mage_ai.data_cleaner.shared.hash import merge_dict
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
        uuid = message.get('uuid')
        output = message.get('output')

        if code:
            connection_file = os.getenv('CONNECTION_FILE')
            with open(connection_file) as f:
                connection = json.loads(f.read())

            manager = KernelManager(**connection)
            client = manager.client()

            msg_id = client.execute(code)

            WebSocketServer.running_executions_mapping.add((msg_id, uuid))
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
