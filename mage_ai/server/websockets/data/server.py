import asyncio

from mage_ai.server.websockets.base import BaseHandler
from mage_ai.server.websockets.constants import Channel
from mage_ai.server.websockets.models import Message
from mage_ai.server.websockets.state_manager.utils import (
    clean_up_directories,
    move_files_from_temp_folders,
)


class Data(BaseHandler):
    channel = Channel.DATA

    @classmethod
    def post_process(self, message: Message) -> None:
        clean_up_directories()
        asyncio.run(move_files_from_temp_folders())

    def on_message(self, raw_message: str):
        message = self.preprocess(raw_message)
        if message.error or message.executed:
            return self.send_message(message)

        """
        Load all available data for this message.
        Do we self.send_message all of it in 1 message or
        use client.execute for each data type found so that everything is asynchronous?

        1. code
        1. output results
        1. variables
        1. pickled objects

        # client = Client.load(message=message)
        print('WTFFFFFFFFFFFFFFFFFFFFFFFFF', message.msg_id)
        """
