try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

from dataclasses import dataclass


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
