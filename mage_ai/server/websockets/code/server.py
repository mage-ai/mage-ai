import asyncio

from mage_ai.server.websockets.base import BaseHandler
from mage_ai.server.websockets.constants import Channel, MsgType
from mage_ai.server.websockets.models import Message
from mage_ai.server.websockets.state_manager.utils import (
    clean_up_directories,
    save_child_message_output,
)


class Code(BaseHandler):
    channel = Channel.CODE

    @classmethod
    def post_process(self, message: Message) -> None:
        # Move these 2 operations to the post process of the websocket that’s responsible
        # for read data operations
        clean_up_directories()

        # This cannot run here or else it removes files needed during execution to store variables.
        # asyncio.run(move_files_from_temp_folders())

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
