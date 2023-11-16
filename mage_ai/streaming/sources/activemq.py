import time
import uuid
from dataclasses import dataclass
from typing import Callable

import stomp
from stomp.exception import ConnectFailedException

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource


@dataclass
class ActiveMQConfig(BaseConfig):
    connection_host: str
    connection_port: int
    queue_name: str
    configure_consume: bool = False
    username: str = 'admin'
    password: str = 'admin'


def messageProcessingFunction(message, handler):
    print('Recieved message: "%s"' % message)
    handler([message])


class ActiveMQMsgListener(stomp.ConnectionListener):
    processMessage = None
    conn = None

    def __init__(self, processMessage, conn, handler):
        self.processMessage = processMessage
        self.conn = conn
        self.handler = handler

    def on_error(self, frame):
        print('Received an error "%s"' % frame.body)

    def on_message(self, frame):
        self.processMessage(frame.body, self.handler)


class ActiveMQSource(BaseSource):
    config_class = ActiveMQConfig

    def init_client(self):
        queue_name = self.config.queue_name
        username = self.config.username
        password = self.config.password
        connection_host = self.config.connection_host
        connection_port = self.config.connection_port

        self._print(f'Starting to initialize consumer for queue {queue_name}')

        try:
            conn = stomp.Connection11([(connection_host, connection_port)])
            self._print('Connecting to broker')
            conn.connect(username, password, wait=True)
            self.connection = conn

            self._print('Connected to broker')

        except ConnectFailedException:
            self._print('Connection Error! Please check broker connection')
            raise ConnectFailedException
        except Exception as e:
            self._print(e)
            raise e

    def read(self, handler: Callable):
        pass

    def batch_read(self, handler: Callable):
        self._print('Start consuming messages.')
        listener = ActiveMQMsgListener(processMessage=messageProcessingFunction,
                                       conn=self.connection,
                                       handler=handler)
        self.connection.set_listener('ActiceMQListerner', listener)
        self.connection.subscribe(destination=f'/queue/{self.config.queue_name}',
                                  id=uuid.uuid4(), headers={})
        try:
            while True:
                time.sleep(10)
        except KeyboardInterrupt:
            self._print('Interrupted! Hence, exiting!')

    def __print_message(self, method):
        self._print(f'Received message {method}')
