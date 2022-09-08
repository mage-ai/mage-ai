from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig


@dataclass
class SlackConfig(BaseConfig):
    webhook_url: str = None
