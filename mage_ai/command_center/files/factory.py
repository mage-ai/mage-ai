from typing import Dict, List

from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.constants import ITEMS


class FileFactory(BaseFactory):
    @classmethod
    def fetch_items(self, **kwargs) -> List[Dict]:
        return ITEMS
