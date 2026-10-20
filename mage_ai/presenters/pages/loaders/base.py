from abc import ABC, abstractmethod
from typing import Any, Dict, List, Union


class BaseLoader(ABC):
    @classmethod
    @abstractmethod
    async def load(self, ids: List[Union[int, str]], query: Dict = None, **kwargs) -> List[Any]:
        pass
