from abc import ABC
from typing import List, Union

from mage_ai.api.operations.constants import OperationType
from mage_ai.presenters.pages.constants import (
    ComponentCategory,
    PageCategory,
    ResourceType,
)


class BaseModel(ABC):
    category: Union[ComponentCategory, PageCategory] = None
    operation: OperationType = None
    resource: ResourceType = None
    version: Union[int, str] = None

    @classmethod
    @property
    def uuid(self) -> str:
        return ':'.join(list(filter(lambda x: x, [
            self.resource,
            self.operation,
            self.category,
        ])))

    @classmethod
    def components(self, **kwargs) -> List['BaseModel']:
        return []

    @classmethod
    def disabled(self, **kwargs) -> bool:
        return False


class PageComponent(BaseModel):
    pass


class ClientPage(BaseModel):
    parent_page: 'ClientPage' = None
