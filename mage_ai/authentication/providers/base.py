from abc import ABC, abstractmethod
from typing import Dict, List

from mage_ai.orchestration.db.models.oauth import Role


class BaseProvider(ABC):
    @abstractmethod
    async def get_user_info(self, **kwargs) -> Dict:
        pass
