from abc import ABC
from typing import List

from mage_ai.command_center.models import Item


class BaseFactory(ABC):
    @classmethod
    def build_items(self, **kwargs) -> List[Item]:
        pass
