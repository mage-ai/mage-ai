from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig


@dataclass
class TeamsConfig(BaseConfig):
    webhook_url: str = None

    @property
    def is_valid(self) -> bool:
        return self.webhook_url is not None and self.webhook_url != 'None'
