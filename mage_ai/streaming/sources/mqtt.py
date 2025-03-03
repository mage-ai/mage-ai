import queue
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Literal, Optional

import paho.mqtt.client as mqtt

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_MS
from mage_ai.streaming.sources.base import BaseSource


@dataclass
class TLSConfig:
    ca_certs: Optional[str] = None
    certfile: Optional[str] = None
    keyfile: Optional[str] = None


@dataclass
class MQTTV5ConnectProperties:
    session_expiry_interval: int = 0


@dataclass
class MQTTConfig(BaseConfig):
    host: str
    port: int
    topic: str
    keepalive: int = 60
    client_id: Optional[str] = None
    qos: Literal[0, 1, 2] = 0
    clean: bool = True
    batch_size: int = DEFAULT_BATCH_SIZE
    timeout_ms: int = DEFAULT_TIMEOUT_MS
    username: Optional[str] = None
    password: Optional[str] = None
    tls: bool = False
    tls_config: Optional[TLSConfig] = None
    connect_properties: Optional[MQTTV5ConnectProperties] = None

    @classmethod
    def parse_config(cls, config: Dict) -> Dict:
        if config.get('tls'):
            tls_config = config.get('tls_config', {})
            config['tls_config'] = TLSConfig(**tls_config)
        connect_properties = config.get('connect_properties')
        if connect_properties:
            config['connect_properties'] = MQTTV5ConnectProperties(**connect_properties)
        return config


class MQTTSource(BaseSource):
    config: MQTTConfig
    config_class = MQTTConfig

    def init_client(self):
        self._client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            protocol=mqtt.MQTTv5,
            client_id=self.config.client_id,
        )
        self._client.username_pw_set(self.config.username, self.config.password)
        if self.config.tls_config:
            self._print('Setting TLS configuration.')
            tls_config = self.config.tls_config
            self._client.tls_set(
                ca_certs=tls_config.ca_certs,
                certfile=tls_config.certfile,
                keyfile=tls_config.keyfile,
            )
        if self.config.connect_properties:
            properties = mqtt.Properties(mqtt.PacketTypes.CONNECT)
            properties.SessionExpiryInterval = (
                self.config.connect_properties.session_expiry_interval
            )

        self._print(f'Connecting client to: {self.config.host}.')
        self._client.connect(
            self.config.host,
            self.config.port,
            clean_start=self.config.clean,
            keepalive=self.config.keepalive,
        )
        self._print('Finish initializing MQTT client.')

    def batch_read(self, handler: Callable[[List[mqtt.MQTTMessage]], Any]):
        self._print('Start consuming messages in batches.')
        self._print(
            f'Subscribing to topic: {self.config.topic} with QoS: {self.config.qos}'
        )
        self._client.subscribe(self.config.topic, qos=self.config.qos)

        q: queue.Queue[mqtt.MQTTMessage] = queue.Queue()

        def on_message(client: mqtt.Client, user_data: dict, message: mqtt.MQTTMessage):
            # Add message to queue to be handle in batches later.
            q.put(message)

        self._client.on_message = on_message
        self._client.loop_start()

        while True:
            messages: List[mqtt.MQTTMessage] = []

            timeout = self.config.timeout_ms / 1000
            # Wait for queue to fill
            if q.empty():
                time.sleep(timeout)
                continue

            for _ in range(self.config.batch_size):
                try:
                    # Non-blocking; raises queue.Empty if the queue is empty
                    message = q.get_nowait()
                    messages.append(message)
                except queue.Empty:
                    break  # Stop the loop if the queue is empty
            if messages:
                start = time.perf_counter()
                handler(messages)
                end = time.perf_counter()
                duration = (end - start) * 1000
                self._print(f'Processed {len(messages)} messages in {duration:.2f} ms')

    def read(self, handler: Callable[[mqtt.MQTTMessage], Any]):
        self._print('Start consuming single messages.')
        self._client.subscribe(self.config.topic)

        def on_message(client: mqtt.Client, user_data: dict, message: mqtt.MQTTMessage):
            self._print(str(message))
            handler(message)

        self._client.on_message = on_message
        self._client.loop_forever()

    def test_connection(self):
        if not self._client.is_connected():
            self._client.reconnect()
        self._print('Test connection successfully.')

    def destroy(self):
        self._print('Disconnect')
        self._client.loop_stop()
        self._client.disconnect()
