import asyncio

from mage_ai.server.websockets.base import BaseHandler
from mage_ai.server.websockets.constants import Channel
from mage_ai.server.websockets.models import Message
from mage_ai.server.websockets.state_manager.utils import (
    clean_up_directories,
    hydrate_message_with_data,
    move_files_from_temp_folders,
)


class Data(BaseHandler):
    channel = Channel.DATA

    @classmethod
    def post_process(self, message: Message) -> None:
        clean_up_directories()
        asyncio.run(move_files_from_temp_folders())

    async def on_message(self, raw_message: str):
        message = self.preprocess(raw_message)
        if message.error or message.executed:
            return self.send_message(message)

        self.send_message(await hydrate_message_with_data(message))

    @classmethod
    def filter_out_sensitive_data(self, message: Message) -> Message:
        return message
