from dataclasses import dataclass
from typing import List

from mage_ai.shared.config import BaseConfig


@dataclass
class TeamsConfig(BaseConfig):
    webhook_url: List[str] = None

    def __post_init__(self):
        # Normalize webhook_url to a list if it's provided as a string
        if isinstance(self.webhook_url, str):
            self.webhook_url = [self.webhook_url]
        elif self.webhook_url is None:
            self.webhook_url = []

    @property
    def is_valid(self) -> bool:
        return bool(self.webhook_url) and all(
            url and url != 'None' and url.strip() != '' for url in self.webhook_url
        )
