from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from mage_ai.shared.models import BaseDataClass


@dataclass
class Message(BaseDataClass):
    data: Any
    uuid: str
    timestamp: Optional[int] = None

    def __post_init__(self):
        self.timestamp = int(datetime.utcnow().timestamp() * 1000)
