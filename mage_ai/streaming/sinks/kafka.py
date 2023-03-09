from dataclasses import dataclass
from kafka import KafkaProducer
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink
from enum import Enum
from typing import Dict, List
import json
import time


class SecurityProtocol(str, Enum):
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
    topic: str
    api_version: str = '0.10.2'
    security_protocol: SecurityProtocol = None
    ssl_config: SSLConfig = None
    sasl_config: SASLConfig = None

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        ssl_config = config.get('ssl_config')
        sasl_config = config.get('sasl_config')
        if ssl_config and type(ssl_config) is dict:
            config['ssl_config'] = SSLConfig(**ssl_config)
        if sasl_config and type(sasl_config) is dict:
            config['sasl_config'] = SASLConfig(**sasl_config)
        return config


class KafkaSink(BaseSink):
    config_class = KafkaConfig

    def init_client(self):
        self._print('Start initializing producer.')
        # Initialize kafka producer
        kwargs = dict(
            bootstrap_servers=self.config.bootstrap_server,
            api_version=self.config.api_version,
        )
        if self.config.security_protocol == SecurityProtocol.SSL:
            kwargs['security_protocol'] = SecurityProtocol.SSL
            kwargs['ssl_cafile'] = self.config.ssl_config.cafile
            kwargs['ssl_certfile'] = self.config.ssl_config.certfile
            kwargs['ssl_keyfile'] = self.config.ssl_config.keyfile
            kwargs['ssl_password'] = self.config.ssl_config.password
            kwargs['ssl_check_hostname'] = self.config.ssl_config.check_hostname
        elif self.config.security_protocol == SecurityProtocol.SASL_SSL:
            kwargs['security_protocol'] = SecurityProtocol.SASL_SSL
            kwargs['sasl_mechanism'] = self.config.sasl_config.mechanism
            kwargs['sasl_plain_username'] = self.config.sasl_config.username
            kwargs['sasl_plain_password'] = self.config.sasl_config.password

        self.producer = KafkaProducer(
            **kwargs
        )
        self._print('Finish initializing producer.')

    def write(self, data: Dict):
        self._print(f'Ingest data {data}, time={time.time()}')
        self.producer.send(
            self.config.topic,
            json.dumps(data).encode('utf-8'),
        )

    def batch_write(self, data: List[Dict]):
        if not data:
            return
        self._print(f'Batch ingest {len(data)} records, time={time.time()}. Sample: {data[0]}')
        for record in data:
            self.producer.send(
                self.config.topic,
                json.dumps(record).encode('utf-8'),
            )
