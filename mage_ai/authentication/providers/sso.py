from abc import ABC, abstractmethod
from typing import Dict


class SsoProvider(ABC):
    @abstractmethod
    async def get_user_info(self, **kwargs) -> Dict:
        pass
