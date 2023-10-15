from abc import ABC, abstractmethod
from typing import List

from mage_ai.services.spark.models import Application


class BaseAPI(ABC):
    @property
    @abstractmethod
    def endpoint(self) -> str:
        pass

    @abstractmethod
    def applications(self, **kwargs) -> List[Application]:
        pass
