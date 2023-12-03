import asyncio
import json
import ssl
import threading
from dataclasses import dataclass
from typing import Callable, Dict, Optional

import nats
from nats.errors import NoServersError

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_MS
from mage_ai.streaming.sources.base import BaseSource


@dataclass
class SSLConfig:
    cafile: str = None
    certfile: str = None
    keyfile: str = None
    check_hostname: bool = False


@dataclass
class NATSConfig(BaseConfig):
    server_url: str
    stream_name: str
    subject: str = None
    nkeys_seed_str: Optional[str] = None
    use_tls: bool = False
    ssl_config: Optional[SSLConfig] = None
    consumer_name: Optional[str] = None
    batch_size: int = DEFAULT_BATCH_SIZE
    timeout: int = DEFAULT_TIMEOUT_MS / 1000  # Convert to seconds

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        ssl_config = config.get('ssl_config')
        if ssl_config and type(ssl_config) is dict:
            config['ssl_config'] = SSLConfig(**ssl_config)
        return config


class NATSSource(BaseSource):
    config_class = NATSConfig

    def __init__(self, config, **kwargs):
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self.start_loop, daemon=True)
        self.thread.start()
        super().__init__(config)

    def start_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def stop_loop(self):
        self.loop.call_soon_threadsafe(self.loop.stop)
        self.thread.join()

    async def ainit_client(self):
        try:
            connect_opts = {
                "servers": [self.config.server_url],
                "error_cb": self.error_cb,
                "reconnected_cb": self.reconnected_cb,
                "disconnected_cb": self.disconnected_cb,
                "closed_cb": self.closed_cb,
            }

            # Configure SSL context if use_tls is True
            if self.config.use_tls and self.config.ssl_config:
                ssl_ctx = ssl.create_default_context(purpose=ssl.Purpose.SERVER_AUTH)
                if self.config.ssl_config.cafile:
                    ssl_ctx.load_verify_locations(self.config.ssl_config.cafile)
                if self.config.ssl_config.certfile and self.config.ssl_config.keyfile:
                    ssl_ctx.load_cert_chain(
                        certfile=self.config.ssl_config.certfile,
                        keyfile=self.config.ssl_config.keyfile
                    )
                connect_opts["tls"] = ssl_ctx

            # Use NKEY if provided
            if self.config.nkeys_seed_str:
                connect_opts["nkeys_seed_str"] = self.config.nkeys_seed_str

            # Establish connection with the configured options
            self.nc = await nats.connect(**connect_opts)
            self.js = self.nc.jetstream()

            # Default consumer_name to stream_name if not provided
            consumer_name = self.config.consumer_name or self.config.stream_name

            # Check if the stream exists, and create it if it doesn't
            try:
                await self.js.stream_info(self.config.stream_name)
            except Exception as e:
                # Check the exception type or message to ensure it's about a missing stream
                if 'stream not found' in str(e).lower():
                    await self.js.add_stream(
                        name=self.config.stream_name,
                        subjects=[self.config.subject],
                    )

            self.psub = await self.js.pull_subscribe(self.config.subject, consumer_name)

        except NoServersError as e:
            self._print(f'Caught NoServersError while connecting to NATS server: {e}')
        except Exception as e:
            self._print(f'Caught exception while connecting to NATS server: {e}')

    # Define callback methods
    async def disconnected_cb(self):
        self._print('Got disconnected!')

    async def reconnected_cb(self):
        self._print(f'Got reconnected to {self.nc.connected_url.netloc}')

    async def error_cb(self, e):
        self._print(f'There was an error: {e}')

    async def closed_cb(self):
        self._print('Connection is closed')

    async def aclose_client(self):
        await self.nc.close()

    def init_client(self):
        future = asyncio.run_coroutine_threadsafe(self.ainit_client(), self.loop)
        future.result()

    def close_client(self):
        asyncio.run_coroutine_threadsafe(self.aclose_client(), self.loop)

    def batch_read(self, handler: Callable):
        self.init_client()

        try:
            while True:
                self._print("Fetching messages...")
                message_tuples = self.fetch_messages()
                self._print(f"Fetched {len(message_tuples)} messages")

                if not message_tuples:
                    self._print("No messages fetched, continuing to next iteration")
                    continue

                processed_messages = []  # List to store successfully processed messages

                for decoded_message, msg in message_tuples:
                    try:
                        # Attempt to process the message
                        processed_messages.append(decoded_message)
                        asyncio.run_coroutine_threadsafe(msg.ack(), self.loop)
                    except Exception as e:
                        self._print(f"Error processing message: {e}")

                # Once all messages in the batch have been attempted,
                # pass the successfully processed messages to the handler
                if processed_messages:
                    handler(processed_messages)

        finally:
            self.close_client()
            self.stop_loop()

    def read(self, handler: Callable):
        self.init_client()

        try:
            while True:
                messages = self.fetch_messages()
                if messages:
                    for data, msg in messages:
                        handler(data)  # Process each decoded message

                        # Acknowledge the original message
                        asyncio.run_coroutine_threadsafe(msg.ack(), self.loop)
        finally:
            self.close_client()
            self.stop_loop()

    async def afetch_messages(self):
        try:
            msgs = await self.psub.fetch(self.config.batch_size, timeout=self.config.timeout)
            # Return a tuple of (decoded_message, message)
            return [(json.loads(msg.data.decode()), msg) for msg in msgs]
        except nats.errors.TimeoutError:
            return []

    def fetch_messages(self):
        future = asyncio.run_coroutine_threadsafe(self.afetch_messages(), self.loop)
        return future.result()
