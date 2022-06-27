from get_messages import get_msg
from jupyter_client import KernelManager
from websocket_client import WebSocketClient
import asyncio
import json
import os
import random
import tornado.ioloop
import tornado.web
import tornado.websocket


class RandomBernoulli:
    def __init__(self):
        self.p = 0.72
        print(f"True p = {self.p}")

    def sample(self):
        return int(random.uniform(0, 1) <= self.p)


class WebSocketSubscribeServer(tornado.websocket.WebSocketHandler):
    clients = set()

    def open(self):
        print('OPENNNNNNNNNNNNN')
        WebSocketSubscribeServer.clients.add(self)

    def on_close(self):
        print('WTFFFFFFFFFFFFFFFFFF CLOSING!!!!!!!!!!')

        if self.close_code and self.close_reason:
            WebSocketSubscribeServer.clients.remove(self)

        print('close_code', self.close_code)
        print('close_reason', self.close_reason)

    def check_origin(self, origin):
        return True

    def on_message(self, message):
        self.send_message(message)

        # while True:
        #     try:
        #         self.ping(b'ping')
        #         for client in self.clients:
        #             fut = client.write_message(message)
        #             await fut
        #     except tornado.iostream.StreamClosedError as e:
        #         print('StreamClosedError:', e)
        #         break
        #     except tornado.websocket.WebSocketClosedError as e:
        #         print('WebSocketClosedError:', self)
        #         break
        #     except KeyError as e:
        #         print('KeyError:', e)
        #         break
        #     # await gen.sleep(5)

    @classmethod
    def send_message(cls, message: str):
        print(f"Sending message {message} to {len(cls.clients)} client(s).")
        for client in cls.clients:
            client.write_message(message)


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


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")

    def check_origin(self, origin):
        return True


def make_app():
    return tornado.web.Application(
        [
            # (r"/websocket/subscribe/", WebSocketSubscribeServer),
            (r"/websocket/", WebSocketServer),
            (r"/", MainHandler),
        ],
        # websocket_ping_interval=1,
        # websocket_ping_timeout=99999,
    )


async def main():
    manager = KernelManager()
    manager.start_kernel()
    # client = manager.client()

    # connection = client.get_connection_info()
    connection_file = manager.connection_file
    os.environ['CONNECTION_FILE'] = connection_file
    print('CONNECTION_FILE', os.getenv('CONNECTION_FILE'))

    # print(connection)
    # print(connection_file)

    # with open('kernel_connection.json', 'w') as f:
    #     if connection.get('key'):
    #         connection['key'] = connection['key'].decode()
    #     f.write(json.dumps(connection))

    # with open('kernel_connection_file_0.txt', 'w') as f:
    #     f.write(connection_file)

    app = make_app()
    app.listen(8888)

    # connection = tornado.websocket.websocket_connect(
    #     url='ws://localhost:8888/websocket/',
    #     # callback=self.maybe_retry_connection,
    #     # on_message_callback=self.on_message,
    #     # ping_interval=10,
    #     # ping_timeout=30,
    # )

    get_msg(
        manager.client(),
        lambda message: WebSocketServer.send_message(message),
        # lambda message: connection.write_message(json.dumps(dict(
        #     output=message,
        # ))),
    )

    # io_loop = asyncio.get_event_loop()
    # client = WebSocketClient(io_loop, connection_file)
    # io_loop.call_soon(lambda loop: client.start(), io_loop)

    # random_bernoulli = RandomBernoulli()
    # periodic_callback = tornado.ioloop.PeriodicCallback(
    #     lambda: WebSocketServer.send_message(str(random_bernoulli.sample())), 100
    # )
    # periodic_callback.start()

    await asyncio.Event().wait()


if __name__ == '__main__':
    asyncio.run(main())
