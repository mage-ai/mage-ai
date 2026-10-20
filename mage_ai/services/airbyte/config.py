from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig


@dataclass
class AirbyteConfig(BaseConfig):
    api_version: str = 'v1'
    host: str = 'localhost'
    password: str = 'password'
    port: int = 8000
    use_ssl: bool = False
    username: str = 'airbyte'
