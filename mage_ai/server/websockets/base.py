import simplejson
from tornado.websocket import WebSocketHandler

from mage_ai.server.websockets.models import Client, Message
from mage_ai.server.websockets.utils import (
    filter_out_sensitive_data,
    parse_raw_message,
    should_filter_message,
    validate_message,
)
from mage_ai.shared.decorators import classproperty
from mage_ai.shared.parsers import encode_complex


class BaseHandler(WebSocketHandler):
    channel = None
    clients = set()
    running_executions_by_class = dict()

    @classproperty
    def running_executions_mapping(self):
        return self.running_executions_by_class.get(self.__name__, {})

    def open(self, uuid: str):
        self.__class__.clients.add(self)
        self.uuid = uuid

    def on_close(self):
        self.__class__.clients.remove(self)

    def check_origin(self, origin):
        return True

    def preprocess(self, raw_message: str) -> Message:
        message = parse_raw_message(raw_message)
        message = validate_message(message)
        return message

    def on_message(self, raw_message: str):
        message = self.preprocess(raw_message)
        if message.error or message.executed:
            return self.send_message(message)

        client = Client.load(message=message)
        message = client.execute()
        if message.msg_id:
            self.running_executions_mapping[message.msg_id] = message

    @classmethod
    def send_message(self, message: Message) -> None:
        if isinstance(message, dict) and ('header' in message or 'parent_header' in message):
            print(simplejson.dumps(
                message,
                default=encode_complex,
                sort_keys=True,
                indent=2,
                ignore_nan=True,
            ))
            message = Message.load_from_publisher_message(**message)

        if should_filter_message(message):
            return

        message = self.filter_out_sensitive_data(message)
        message = self.format_error(message)

        if message.msg_id in self.running_executions_mapping:
            message = self.running_executions_mapping.get(message.msg_id)

        for client in self.clients:
            client.write_message(simplejson.dumps(
                message.to_dict(),
                default=encode_complex,
                ignore_nan=True,
                use_decimal=True,
            ) if message else '')

        self.post_process(message)

    @classmethod
    def filter_out_sensitive_data(self, message: Message) -> Message:
        return filter_out_sensitive_data(message)

    @classmethod
    def format_error(self, message: Message) -> Message:
        return message

    @classmethod
    def post_process(self, message: Message) -> None:
        pass
