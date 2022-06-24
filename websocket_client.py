""" Stream data from the WebSocket and update the Beta posterior parameters online. """

from jupyter_client import KernelManager
import argparse
import json
import tornado.ioloop
import tornado.websocket


class WebSocketClient:
    def __init__(self, io_loop, connection_file):
        self.connection = None
        self.io_loop = io_loop
        self.num_successes = 0
        self.num_trials = 0
        self.connection = None
        self.connection_file = connection_file

    @property
    def client(self):
        with open(self.connection_file) as f:
            connection = json.loads(f.read())

        manager = KernelManager(**connection)
        return manager.client()

    def publish_message(self, message):
        self.connection.write_message(json.dumps(dict(
            output=message,
        )))
        print(message)

    def get_msg(self, kern):
        while True:
            self.connection = self.connect_and_read()

            try:
                message = kern.get_iopub_msg(timeout=1)

                print('message', message)

                content = message.get('content', {})

                print('content', content)

                execution_state = content.get('execution_state')
                print('execution_state', execution_state)

                if content:
                    traceback = content.get('traceback')
                    data = content.get('data', {})
                    text = data.get('text/plain')
                    code = data.get('code')

                    if content.get('name') == 'stdout':
                        text_stdout = content.get('text')
                        self.publish_message(text_stdout)
                    elif traceback:
                        for line in traceback:
                            self.publish_message(line)
                    elif text:
                        self.publish_message(text)
                    elif code:
                        self.publish_message(code)
            except Exception as e:
                print('timeout kc.get_iopub_msg')
                if str(e):
                    # ERROR '_asyncio.Future' object has no attribute 'write_message'
                    print('ERROR', e)
                pass

    def start(self):
        self.get_msg(self.client)

    def stop(self):
        self.io_loop.stop()

    def connect_and_read(self):
        print("Reading...")
        self.connection = tornado.websocket.websocket_connect(
            url=f"ws://localhost:8888/websocket/",
            callback=self.maybe_retry_connection,
            # on_message_callback=self.on_message,
            # ping_interval=10,
            # ping_timeout=30,
        )

        return self.connection

    def maybe_retry_connection(self, future) -> None:
        try:
            self.connection = future.result()
        except:
            print("Could not reconnect, retrying in 3 seconds...")
            self.io_loop.call_later(3, self.connect_and_read)

    def on_message(self, message):
        if message is None:
            print("Disconnected, reconnecting...")
            self.connect_and_read()

        # self.connection.write_message(message)

        # message = int(message)
        # self.num_successes += message
        # self.num_trials += 1

        # alpha = 2 + self.num_successes
        # beta = 2 + self.num_trials - self.num_successes
        # mean = self.num_successes / self.num_trials
        # print(f"α = {alpha}; β = {beta}; mean = {mean}")


def main(connection_file):
    # Create an event loop (what Tornado calls an IOLoop).
    io_loop = tornado.ioloop.IOLoop.current()

    # Before starting the event loop, instantiate a WebSocketClient and add a
    # callback to the event loop to start it. This way the first thing the
    # event loop does is to start the client.
    client = WebSocketClient(io_loop, connection_file)
    io_loop.add_callback(client.start)

    # Start the event loop.
    io_loop.start()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--conn_file', type=str, default=None)
    args = parser.parse_args()

    connection_file = args.conn_file
    print('connection_file', connection_file)

    main(connection_file=connection_file)
