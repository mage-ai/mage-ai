from typing import List

import simplejson
from tornado.websocket import WebSocketHandler

from mage_ai.server.websockets.models import Client, Error, Message
from mage_ai.server.websockets.utils import (
    filter_out_sensitive_data,
    parse_raw_message,
    should_filter_message,
    validate_message,
)
from mage_integrations.utils.parsers import encode_complex


class BaseHandler(WebSocketHandler):
    channel = None
    clients = set()
    running_executions_mapping = dict()

    def open(self):
        self.__class__.clients.add(self)

    def on_close(self):
        self.__class__.clients.remove(self)

    def check_origin(self, origin):
        return True

    def on_message(self, raw_message: str):
        message = parse_raw_message(raw_message)
        message = validate_message(message)

        if message.error or message.executed:
            return self.send_message(message)

        client = Client.load(message=message)
        message = client.execute()

        self.__class__.running_executions_mapping[message.msg_id] = message

    @classmethod
    def send_message(self, message: Message) -> None:
        if not message.executed or not message.msg_id:
            return

        if should_filter_message(message):
            return

        message = filter_out_sensitive_data(message)
        if message.error:
            message.data = self.format_error(message.error)

        message = self.running_executions_mapping.get(message.msg_id)
        for client in self.clients:
            client.write_message(simplejson.dumps(
                message.to_dict(),
                default=encode_complex,
                ignore_nan=True,
                use_decimal=True,
            ) if message else '')

    @classmethod
    def format_error(self, error: Error) -> List[str]:
        pass
