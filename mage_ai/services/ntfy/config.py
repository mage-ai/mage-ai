from dataclasses import dataclass, field
from typing import List

from mage_ai.shared.config import BaseConfig


@dataclass
class NtfyConfig(BaseConfig):
    webhook_url: str = None
    priority: str = "default"
    tags: List = field(default_factory=list)

    def __post_init__(self):
        # Normalize webhook_url: strip surrounding whitespace if provided as a string.
        if isinstance(self.webhook_url, str):
            self.webhook_url = self.webhook_url.strip()

    @property
    def is_valid(self) -> bool:
        return self.webhook_url is not None and self.webhook_url != 'None'
