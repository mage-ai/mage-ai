from dataclasses import dataclass

from mage_ai.shared.enum import StrEnum


class SerializationMethod(StrEnum):
    AVRO = 'AVRO'
    JSON = 'JSON'
    PROTOBUF = 'PROTOBUF'
    RAW_VALUE = 'RAW_VALUE'


@dataclass
class SerDeConfig:
    serialization_method: SerializationMethod
    schema_classpath: str = None            # Used by PROTOBUF
    schema_registry_url: str = None         # Used by AVRO
    schema_registry_username: str = None    # Used by AVRO
    schema_registry_password: str = None    # Used by AVRO
