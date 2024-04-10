import importlib
import json
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Dict, List

from kafka import KafkaConsumer, TopicPartition

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_MS
from mage_ai.streaming.sources.base import BaseSource
from mage_ai.streaming.sources.shared import SerDeConfig, SerializationMethod


class SecurityProtocol(str, Enum):
    SASL_PLAINTEXT = 'SASL_PLAINTEXT'
    SASL_SSL = 'SASL_SSL'
    SSL = 'SSL'


@dataclass
class SASLConfig:
    mechanism: str = 'PLAIN'
    username: str = None
    password: str = None


@dataclass
class SSLConfig:
    cafile: str = None
    certfile: str = None
    keyfile: str = None
    password: str = None
    check_hostname: bool = False


@dataclass
class KafkaConfig(BaseConfig):
    bootstrap_server: str
    consumer_group: str
    api_version: str = '0.10.2'
    batch_size: int = DEFAULT_BATCH_SIZE
    timeout_ms: int = DEFAULT_TIMEOUT_MS
    auto_offset_reset: str = 'latest'
    include_metadata: bool = False
    security_protocol: SecurityProtocol = None
    ssl_config: SSLConfig = None
    sasl_config: SASLConfig = None
    serde_config: SerDeConfig = None
    topic: str = None
    topics: List = field(default_factory=list)
    offset: Dict = None
    max_partition_fetch_bytes: int = 1048576

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        ssl_config = config.get('ssl_config')
        sasl_config = config.get('sasl_config')
        serde_config = config.get('serde_config')
        if ssl_config and type(ssl_config) is dict:
            config['ssl_config'] = SSLConfig(**ssl_config)
        if sasl_config and type(sasl_config) is dict:
            config['sasl_config'] = SASLConfig(**sasl_config)
        if serde_config and type(serde_config) is dict:
            config['serde_config'] = SerDeConfig(**serde_config)
        return config


class KafkaSource(BaseSource):
    config_class = KafkaConfig

    def init_client(self):
        if not self.config.topic and not self.config.topics:
            raise Exception('Please specify topic or topics in the Kafka config.')

        if self.config.offset and self.config.offset.get("partitions") is None:
            raise Exception('Please specify topic partitions')

        self._print('Start initializing consumer.')
        # Initialize kafka consumer
        consumer_kwargs = dict(
            group_id=self.config.consumer_group,
            bootstrap_servers=self.config.bootstrap_server,
            api_version=self.config.api_version,
            auto_offset_reset=self.config.auto_offset_reset,
            max_partition_fetch_bytes=self.config.max_partition_fetch_bytes,
            enable_auto_commit=True,
        )
        if self.config.security_protocol == SecurityProtocol.SSL:
            consumer_kwargs['security_protocol'] = SecurityProtocol.SSL
            consumer_kwargs['ssl_cafile'] = self.config.ssl_config.cafile
            consumer_kwargs['ssl_certfile'] = self.config.ssl_config.certfile
            consumer_kwargs['ssl_keyfile'] = self.config.ssl_config.keyfile
            consumer_kwargs['ssl_password'] = self.config.ssl_config.password
            consumer_kwargs[
                'ssl_check_hostname'
            ] = self.config.ssl_config.check_hostname
        elif self.config.security_protocol == SecurityProtocol.SASL_SSL:
            consumer_kwargs['security_protocol'] = SecurityProtocol.SASL_SSL
            consumer_kwargs['sasl_mechanism'] = self.config.sasl_config.mechanism
            consumer_kwargs['sasl_plain_username'] = self.config.sasl_config.username
            consumer_kwargs['sasl_plain_password'] = self.config.sasl_config.password

            if self.config.ssl_config is not None and self.config.ssl_config.cafile:
                consumer_kwargs['ssl_cafile'] = self.config.ssl_config.cafile
        elif self.config.security_protocol == SecurityProtocol.SASL_PLAINTEXT:
            consumer_kwargs['security_protocol'] = SecurityProtocol.SASL_PLAINTEXT
            consumer_kwargs['sasl_mechanism'] = self.config.sasl_config.mechanism
            consumer_kwargs['sasl_plain_username'] = self.config.sasl_config.username
            consumer_kwargs['sasl_plain_password'] = self.config.sasl_config.password

        if self.config.topic:
            topics = [self.config.topic]
        else:
            topics = self.config.topics

        self.consumer = KafkaConsumer(*topics, **consumer_kwargs)
        self._print('Finish initializing consumer.')

        self.schema_class = None
        if self.config.serde_config is not None:
            if (
                self.config.serde_config.serialization_method
                == SerializationMethod.PROTOBUF
            ):
                schema_classpath = self.config.serde_config.schema_classpath
                if schema_classpath is None:
                    return
                self._print(f'Loading message schema from {schema_classpath}')
                parts = schema_classpath.split('.')
                if len(parts) >= 2:
                    class_name = parts[-1]
                    libpath = '.'.join(parts[:-1])
                    self.schema_class = getattr(
                        importlib.import_module(libpath),
                        class_name,
                    )
            elif (
                self.config.serde_config.serialization_method
                == SerializationMethod.AVRO
            ):
                from confluent_avro import AvroKeyValueSerde, SchemaRegistry
                from confluent_avro.schema_registry import HTTPBasicAuth

                self.registry_client = SchemaRegistry(
                    self.config.serde_config.schema_registry_url,
                    HTTPBasicAuth(
                        self.config.serde_config.schema_registry_username,
                        self.config.serde_config.schema_registry_password,
                    ),
                    headers={'Content-Type': 'application/vnd.schemaregistry.v1+json'},
                )
                self.avro_serde = AvroKeyValueSerde(
                    self.registry_client, self.config.topic
                )

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

    def _handle_offsets(self):
        self._print('Configuring consumer offset')
        self.consumer.unsubscribe()
        partitions = [TopicPartition(partition['topic'], partition['partition']) for partition
                      in self.config.offset.get('partitions')]
        self._print(f'{partitions}')
        self.consumer.assign(partitions=partitions)

        offset_type = self.config.offset.get('type')
        offset_value = self.config.offset.get('value')

        if offset_type == 'int':
            for partition in partitions:
                self.consumer.seek(partition=partition,
                                   offset=offset_value)
        elif offset_type == 'timestamp':
            timestamps = {partition: offset_value for partition in partitions}
            # Retrieve each partition offset for given time
            offset_times = self.consumer.offsets_for_times(timestamps)

            for partition in partitions:
                self.consumer.seek(partition=partition,
                                   offset=offset_times[partition].offset)
        elif offset_type == 'beginning':
            self.consumer.seek_to_beginning()

        elif offset_type == 'end':
            self.consumer.seek_to_end()

    def read(self, handler: Callable):
        if self.config.offset:
            self._handle_offsets()
        self._print('Start consuming single messages.')
        for message in self.consumer:
            self.__print_message(message)
            message = self._convert_message(message)
            handler(message)

    async def read_async(self, handler: Callable):
        if self.config.offset:
            self._handle_offsets()
        self._print('Start consuming messages asynchronously.')
        for message in self.consumer:
            self.__print_message(message)
            message = self._convert_message(message)
            await handler(message)

    def batch_read(self, handler: Callable):
        if self.config.offset:
            self._handle_offsets()
        self._print('Start consuming messages in batches.')
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE
        if self.config.timeout_ms > 0:
            timeout_ms = self.config.timeout_ms
        else:
            timeout_ms = DEFAULT_TIMEOUT_MS

        while True:
            # Response format is {TopicPartiton('topic1', 1): [msg1, msg2]}
            msg_pack = self.consumer.poll(
                max_records=batch_size,
                timeout_ms=timeout_ms,
            )

            message_values = []
            msg_printed = False
            for _tp, messages in msg_pack.items():
                self._print(
                    f'Received {len(messages)} messages from topic="{_tp.topic}" '
                    + f'partition={_tp.partition} at time={time.time()}'
                )
                for message in messages:
                    if not msg_printed:
                        self.__print_message(message)
                        msg_printed = True

                    message = self._convert_message(message)
                    message_values.append(message)
            if len(message_values) > 0:
                handler(message_values)

    def test_connection(self):
        self.consumer._client.check_version(timeout=5)
        self._print('Test connection successfully.')

    def __deserialize_message(self, message):
        if self.config.serde_config is None:
            return self.__deserialize_json(message)
        if (
            self.config.serde_config.serialization_method
            == SerializationMethod.PROTOBUF
            and self.schema_class is not None
        ):
            from google.protobuf.json_format import MessageToDict

            obj = self.schema_class()
            obj.ParseFromString(message)
            return MessageToDict(obj)
        elif self.config.serde_config.serialization_method == SerializationMethod.AVRO:
            return self.avro_serde.value.deserialize(message)
        elif (
            self.config.serde_config.serialization_method
            == SerializationMethod.RAW_VALUE
        ):
            return message
        else:
            return json.loads(message.decode('utf-8'))

    def __deserialize_json(self, message):
        return json.loads(message.decode('utf-8'))

    def __print_message(self, message):
        self._print(
            f'Receive message {message.partition}:{message.offset}: '
            f'key={message.key}, value={message.value}, time={time.time()}'
        )
