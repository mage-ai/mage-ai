from jupyter_client import KernelManager
from kernel_output_parser import parse_output_message
from subscriber import get_messages
from websocket import WebSocketServer
import asyncio
import json
import os
import tornado.ioloop
import tornado.web


class ApiHandler(tornado.web.RequestHandler):
    def check_origin(self, origin):
        return True

    def set_default_headers(self):
        self.set_header('Content-Type', 'application/json')

    def get(self):
        value = self.get_argument('value', None)
        r = json.dumps(dict(
            method='get',
            value=value,
        ))
        self.write(r)
        self.finish()

    def post(self):
        r = json.dumps(dict(
            method='post',
        ))
        self.write(r)


def make_app():
    return tornado.web.Application(
        [
            (r'/websocket/', WebSocketServer),
            (r'/api/', ApiHandler),
        ],
        autoreload=True,
    )


async def main():
    manager = KernelManager()
    manager.start_kernel()

    connection_file = manager.connection_file
    os.environ['CONNECTION_FILE'] = connection_file

    app = make_app()
    app.listen(6789)

    get_messages(
        manager.client(),
        lambda content: WebSocketServer.send_message(
            parse_output_message(content),
        ),
    )

    await asyncio.Event().wait()


if __name__ == '__main__':
    print('Starting server...')

    asyncio.run(main())
