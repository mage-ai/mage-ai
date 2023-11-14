import json
import ssl
from dataclasses import dataclass, field
from typing import Callable, List, Optional

import nats

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_MS
from mage_ai.streaming.sources.base import BaseSource


# NATS Configuration Class
@dataclass
class NATSConfig(BaseConfig):
    server_url: str
    batch_size: int = DEFAULT_BATCH_SIZE
    timeout_ms: int = DEFAULT_TIMEOUT_MS
    consumer_name: str = 'mage_consumer'
    subject: str = None
    subjects: List = field(default_factory=list)
    use_tls: bool = False
    cafile: Optional[str] = None
    certfile: Optional[str] = None
    keyfile: Optional[str] = None
    tls_hostname: Optional[str] = None
    user_credentials: Optional[str] = None


# NATS Source Class
class NATSSource(BaseSource):
    config_class = NATSConfig

    async def init_client(self):
        if not self.config.topic and not self.config.topics:
            raise Exception('Please specify a topic or topics to subscribe to in the NATS config.')

        # Add credentials to the connection if provided
        connect_options = {
            'servers': [self.config.server_url]
        }

        if self.config.user_credentials:
            connect_options['user_credentials'] = self.config.user_credentials

        if self.config.use_tls:
            ssl_ctx = ssl.create_default_context(purpose=ssl.Purpose.SERVER_AUTH)
            if self.config.cafile:
                ssl_ctx.load_verify_locations(self.config.cafile)
            if self.config.certfile and self.config.keyfile:
                ssl_ctx.load_cert_chain(certfile=self.config.certfile, keyfile=self.config.keyfile)
            connect_options['tls'] = ssl_ctx
            connect_options['tls_hostname'] = self.config.tls_hostname

        self._print('Initializing NATS client.')
        nc = await nats.connect(**connect_options)
        js = await nc.jetstream()
        await self.client.connect(self.config.server_url, **connect_options)
        self._print('NATS client initialized.')

        # Determine the subjects to subscribe to
        subjects_to_subscribe = (
            [self.config.subject] if self.config.subject else self.config.subjects
        )

        # Subscribe to each subject
        for subject in subjects_to_subscribe:
            await js.add_stream(
                subject=subject,
                durable_name=self.config.consumer_name,
                deliver_all=True,
                callback=self.message_handler
            )

    async def message_handler(self, msg, handler: Callable):
        data = self.__deserialize_json(msg.data)
        await handler(data)

    def _convert_message(self, message):
        if self.config.include_metadata:
            message = {
                'data': self.__deserialize_message(message.value),
                'metadata': {
                    'key': message.key.decode() if message.key else None,
                    'partition': message.partition,
                    'offset': message.offset,
                    'time': int(message.timestamp),
                    'topic': message.topic,
                },
            }
        else:
            message = self.__deserialize_message(message.value)
        return message

    def read(self, handler: Callable):
        self._print('Start consuming messages synchronously.')
        for message in self.consumer:
            self.__print_message(message)
            message = self._convert_message(message)
            handler(message)

    async def read_async(self, handler: Callable):
        self._print('Start consuming messages asynchronously.')

    async def batch_read(self, handler: Callable):
        batch_size = self.config.batch_size if self.config.batch_size > 0 else DEFAULT_BATCH_SIZE
        subject = self.config.subject

        # Create pull based consumer
        pull_sub = await self.js.pull_subscribe(subject, self.config.consumer_name)

        while True:
            try:
                # Fetch messages in batches
                msgs = await pull_sub.fetch(batch_size)
                for msg in msgs:
                    await msg.ack()
                    message_data = self.__deserialize_json(msg.data)
                    handler(message_data)  # Process each message
            except TimeoutError:
                # Handle timeout error or break the loop
                break

    def test_connection(self):
        return True

    def __deserialize_json(self, message):
        return json.loads(message.decode('utf-8'))

    def __print_message(self, msg):
        # Format the message details for printing
        message_details = {
            'subject': msg.subject,
            'reply': msg.reply,
            'data': msg.data.decode('utf-8'),  # Assuming the message data is a UTF-8 string
            'timestamp': msg.timestamp,  # If available
        }
        self._print(f"Received message: {message_details}")
