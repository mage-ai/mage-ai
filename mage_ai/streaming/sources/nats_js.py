import asyncio
import json

# from nats.errors import NoServersError
import threading
from dataclasses import dataclass, field
from typing import Callable, Dict, List

import nats

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_MS
from mage_ai.streaming.sources.base import BaseSource


@dataclass
class SSLConfig:
    cafile: str = None
    certfile: str = None
    keyfile: str = None
    password: str = None
    check_hostname: bool = False


@dataclass
class NATSConfig(BaseConfig):
    server_url: str
    subject: str = None
    subjects: List = field(default_factory=list)
    use_tls: bool = False
    ssl_config: SSLConfig = None
    consumer_name: str = None
    batch_size: int = DEFAULT_BATCH_SIZE
    timeout_ms: int = DEFAULT_TIMEOUT_MS  # Timeout in seconds

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        ssl_config = config.get('ssl_config')
        if ssl_config and type(ssl_config) is dict:
            config['ssl_config'] = SSLConfig(**ssl_config)
        return config

    @classmethod
    def load(cls, config):
        # Assuming config is a dictionary with keys corresponding to NATSConfig fields
        return cls(**config)


class NATSSource(BaseSource):
    config_class = NATSConfig

    def __init__(self, config, **kwargs):
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self.start_loop, daemon=True)
        self.thread.start()
        self.checkpoint_path = kwargs.get('checkpoint_path')
        super().__init__(config)

    def start_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def stop_loop(self):
        self.loop.call_soon_threadsafe(self.loop.stop)
        self.thread.join()

    async def ainit_client(self):
        try:
            self.nc = await nats.connect(
                self.config.server_url,
                error_cb=self.error_cb,
                reconnected_cb=self.reconnected_cb,
                disconnected_cb=self.disconnected_cb,
                closed_cb=self.closed_cb,
            )
            self.js = self.nc.jetstream()
            await self.js.add_stream(name=self.config.consumer_name, subjects=[self.config.subject])
            self.psub = await self.js.pull_subscribe(self.config.subject, "mage_psub")
        except Exception as e:
            self._print(f'Caught exception while connecting to NATS server: {e}')
        # except NoServersError as e:
        #    print(f"Failed to connect to NATS server: {e}")

    # Define callback methods
    async def disconnected_cb(self):
        print('Got disconnected!')

    async def reconnected_cb(self):
        print(f'Got reconnected to {self.nc.connected_url.netloc}')

    async def error_cb(self, e):
        print(f'There was an error: {e}')

    async def closed_cb(self):
        print('Connection is closed')

    async def aclose_client(self):
        await self.nc.close()

    def init_client(self):
        # asyncio.run_coroutine_threadsafe(self.ainit_client(), self.loop)
        future = asyncio.run_coroutine_threadsafe(self.ainit_client(), self.loop)
        future.result()

    def close_client(self):
        asyncio.run_coroutine_threadsafe(self.aclose_client(), self.loop)

    def batch_read(self, handler: Callable):
        self.init_client()

        try:
            while True:
                messages = self.fetch_messages()
                if not messages:
                    break
                handler(messages)  # Pass the entire batch to the handler
        finally:
            self.close_client()
            self.stop_loop()

    async def afetch_messages(self):
        try:
            msgs = await self.psub.fetch(self.config.batch_size, timeout=self.config.timeout_ms)
            return [json.loads(msg.data.decode()) for msg in msgs]
        except nats.errors.TimeoutError:
            return []

    def fetch_messages(self):
        future = asyncio.run_coroutine_threadsafe(self.afetch_messages(), self.loop)
        return future.result()

    def read(self, handler: Callable):
        self.init_client()

        try:
            while True:
                messages = self.fetch_messages()
                if not messages:
                    break
                for message in messages:
                    handler(message)
        finally:
            self.close_client()
            self.stop_loop()
