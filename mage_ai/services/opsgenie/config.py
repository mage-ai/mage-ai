from dataclasses import dataclass, field
from mage_ai.shared.config import BaseConfig
from typing import List, Dict


@dataclass
class OpsgenieConfig(BaseConfig):
    url: str = None
    api_key: str = None
    priority: str = "P3"
    responders: List[Dict] = field(default_factory=list)
    tags: List = field(default_factory=list)
    details: Dict = field(default_factory=dict)

    @property
    def is_valid(self) -> bool:
        return self.url is not None and self.url != 'None'\
            and self.api_key is not None and self.api_key != 'None'
