from abc import ABC
from typing import Dict, List, Union

import inflection

from mage_ai.api.operations.constants import OperationType
from mage_ai.presenters.pages.models.constants import (
    ComponentCategory,
    PageCategory,
    ResourceType,
)


class BaseModel(ABC):
    category: Union[ComponentCategory, PageCategory] = None
    operation: OperationType = None
    parent: Union['ClientPage', 'PageComponent'] = None
    resource: ResourceType = None
    uuid: str = None
    uuid_from_name: bool = False
    version: Union[int, str] = None

    @classmethod
    def get_uuid(self) -> str:
        if self.uuid_from_name:
            return inflection.underscore(self.__name__)

        if self.uuid:
            return self.uuid

        parts = list(filter(lambda x: x, [
            self.resource,
            self.operation,
            self.category,
        ]))

        if len(parts) >= 1:
            return ':'.join(parts)

        return inflection.underscore(self.__name__)

    @classmethod
    def components(self, **kwargs) -> List['BaseModel']:
        return []

    @classmethod
    def disabled(self, **kwargs) -> bool:
        return False

    @classmethod
    def to_dict(self, **kwargs) -> Dict:
        return dict(
            category=self.category,
            components=[c.to_dict(**kwargs) for c in self.components(**kwargs)],
            disabled=self.disabled(**kwargs),
            operation=self.operation,
            parent=self.parent.to_dict(**kwargs) if self.parent else None,
            resource=self.resource,
            uuid=self.get_uuid(),
            version=self.version,
        )


class PageComponent(BaseModel):
    pass


class ClientPage(BaseModel):
    pass
