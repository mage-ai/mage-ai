from jupyter_client import KernelManager
from jupyter_client.multikernelmanager import MultiKernelManager
from kernel_output_parser import parse_output_message
from subscriber import get_messages
from websocket import WebSocketServer
import asyncio
import json
import os
import tornado.ioloop
import tornado.web


manager = KernelManager()


class BaseHandler(tornado.web.RequestHandler):
    def check_origin(self, origin):
        return True

    def set_default_headers(self):
        self.set_header('Content-Type', 'application/json')


class ApiHandler(BaseHandler):
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


class KernelsHandler(BaseHandler):
    def get(self, kernel_id, action):
        if 'interrupt' == action:
            manager.interrupt_kernel()
        elif 'restart' == action:
            manager.restart_kernel()

        r = json.dumps(dict(
            method='get',
            value=kernel_id,
        ))
        self.write(r)
        self.finish()


def make_app():
    return tornado.web.Application(
        [
            (r'/websocket/', WebSocketServer),
            (r'/api/', ApiHandler),
            (r'/kernels/(?P<kernel_id>[\w\-]+)/(?P<action>\w+)', KernelsHandler),
        ],
        autoreload=True,
    )


async def main():
    manager.start_kernel()
    os.environ['KERNEL_ID'] = manager.kernel_id

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
