import asyncio

from mage_ai.server.websockets.base import BaseHandler
from mage_ai.server.websockets.constants import Channel, MsgType
from mage_ai.server.websockets.models import Message
from mage_ai.server.websockets.state_manager.utils import save_child_message_output
from mage_ai.shared.decorators import classproperty


class Code(BaseHandler):
    channel = Channel.CODE

    @classproperty
    def running_executions_mapping(self):
        return self.running_executions_by_class.get(self.__name__, {})

    @classmethod
    def post_process(self, message: Message) -> None:
        if message and \
                message.parent_message and \
                message.parent_message.msg_type == MsgType.EXECUTE_REQUEST:

            if message.msg_type not in [
                MsgType.EXECUTE_INPUT,
                MsgType.IDLE,
                MsgType.SHUTDOWN_REQUEST,
                MsgType.STATUS,
                MsgType.USAGE_REQUEST,
            ]:
                if message.msg_type in [
                    MsgType.STREAM,
                ] or message.data or message.data_type or message.data_types:
                    asyncio.run(save_child_message_output(message))
