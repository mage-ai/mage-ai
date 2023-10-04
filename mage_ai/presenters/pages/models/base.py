import asyncio
from abc import ABC
from typing import Dict, List, Union

import inflection

from mage_ai.api.operations.constants import OperationType
from mage_ai.orchestration.db.models.oauth import User
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
    async def components(self, current_user: User = None, **kwargs) -> List['BaseModel']:
        return []

    @classmethod
    async def disabled(self, current_user: User = None, **kwargs) -> bool:
        return False

    @classmethod
    async def metadata(self, current_user: User = None, **kwargs) -> Dict:
        return {}

    @classmethod
    async def to_dict(self, current_user: User = None, **kwargs) -> Dict:
        components = await self.components(
            current_user=current_user,
            **kwargs,
        ) or []

        return dict(
            category=self.category,
            components=await asyncio.gather(*[c.to_dict(
                current_user=current_user,
                **kwargs,
            ) for c in components]),
            disabled=await self.disabled(
                current_user=current_user,
                **kwargs,
            ),
            metadata=await self.metadata(current_user=current_user, **kwargs),
            operation=self.operation,
            parent=await self.parent.to_dict(
                current_user=current_user,
                **kwargs,
            ) if self.parent else None,
            resource=self.resource,
            uuid=self.get_uuid(),
            version=self.version,
        )


class PageComponent(BaseModel):
    pass


class ClientPage(BaseModel):
    pass
