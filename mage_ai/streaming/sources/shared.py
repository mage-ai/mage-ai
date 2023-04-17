from dataclasses import dataclass
from enum import Enum


class SerializationMethod(str, Enum):
    JSON = 'JSON'
    PROTOBUF = 'PROTOBUF'
    RAW_VALUE = 'RAW_VALUE'


@dataclass
class SerDeConfig:
    serialization_method: SerializationMethod
    schema_classpath: str = None
