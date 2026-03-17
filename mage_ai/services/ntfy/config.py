from dataclasses import dataclass

from mage_ai.shared.config import BaseConfig


@dataclass
class NtfyConfig(BaseConfig):
    base_url: str = None
    topic: str = None

    @property
    def is_valid(self) -> bool:
        return bool(self.base_url) and bool(self.topic)
