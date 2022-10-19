from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig


@dataclass
class S3Config(BaseConfig):
    bucket: str
    prefix: str
