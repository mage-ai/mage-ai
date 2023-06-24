from collections import namedtuple
from dataclasses import dataclass
from typing import Callable

from aiocometd.constants import ConnectionType
from aiocometd.transports.registry import register_transport
from aiosfstream import SalesforceStreamingClient

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource, SourceConsumeMethod
from mage_ai.utils.salesforce_update import UpdatedLongPollingTransport

register_transport(ConnectionType.LONG_POLLING)(UpdatedLongPollingTransport)


@dataclass
class SalesforceConfig(BaseConfig):
    consumer_key: str
    consumer_secret: str
    username: str
    password: str
    channels: list


class SalesforceSource(BaseSource):
    config_class = SalesforceConfig
    consume_method = SourceConsumeMethod.READ_ASYNC

    def init_client(self):
        pass

    async def read_async(self, handler: Callable):
        message_tuple = namedtuple("Payload", ['topic', 'data'])
        self._print('Connecting to Salesforce client...')
        async with SalesforceStreamingClient(
                consumer_key=self.config.consumer_key,
                consumer_secret=self.config.consumer_secret,
                username=self.config.username,
                password=self.config.password
        ) as client:

            self._print('Connected to Salesforce client!')
            for channel in self.config.channels:
                await client.subscribe(channel=channel)
                self._print(f'Subscribed to {channel} channel')

            self._print('Waiting for messages...')
            async for message in client:
                topic = message["channel"]
                data = message["data"]
                full_message = message_tuple(topic, data)
                await handler(full_message)

    def read(self, handler: Callable):
        pass

    def batch_read(self, handler: Callable):
        pass
