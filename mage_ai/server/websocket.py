from jupyter_client import KernelManager
import json
import os
import tornado.websocket


class WebSocketServer(tornado.websocket.WebSocketHandler):
    """Simple WebSocket handler to serve clients."""

    # Note that `clients` is a class variable and `send_message` is a
    # classmethod.
    clients = set()

    def open(self):
        WebSocketServer.clients.add(self)

    def on_close(self):
        WebSocketServer.clients.remove(self)

    def check_origin(self, origin):
        return True

    def on_message(self, raw_message):
        # self.send_message(f'Random: {random.randint(0, 100)}')
        print('raw_message', raw_message)

        message = json.loads(raw_message)
        code = message.get('code')
        output = message.get('output')

        if code:
            connection_file = os.getenv('CONNECTION_FILE')
            print('connection_file', connection_file)
            with open(connection_file) as f:
                connection = json.loads(f.read())

            manager = KernelManager(**connection)
            client = manager.client()

            client.execute(code)

            # self.on_message(json.dumps(dict(output=code)))
        elif output:
            self.send_message(output)

    @classmethod
    def send_message(cls, message: str):
        print(f"Sending message {message} to {len(cls.clients)} client(s).")
        for client in cls.clients:
            client.write_message(message)
