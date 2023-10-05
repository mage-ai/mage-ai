import asyncio
from abc import ABC
from dataclasses import dataclass
from typing import Dict, List, Union

import inflection

from mage_ai.api.operations.constants import OperationType
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.presenters.pages.models.constants import (
    ComponentCategory,
    PageCategory,
    ResourceType,
)


def get_uuid(model) -> str:
    if model.uuid_from_name:
        return inflection.underscore(model.__name__)

    if model.uuid:
        return model.uuid

    parts = list(filter(lambda x: x, [
        model.resource,
        model.operation,
        model.category,
    ]))

    if len(parts) >= 1:
        return ':'.join(parts)

    return inflection.underscore(model.__name__)


async def to_dict(model, current_user: User = None, **kwargs) -> Dict:
    components = await model.components(
        current_user=current_user,
        **kwargs,
    ) or []

    return dict(
        category=model.category,
        components=await asyncio.gather(*[c.to_dict(
            current_user=current_user,
            **kwargs,
        ) for c in components]),
        disabled=await model.disabled(
            current_user=current_user,
            **kwargs,
        ),
        enabled=await model.enabled(
            current_user=current_user,
            **kwargs,
        ),
        metadata=await model.metadata(current_user=current_user, **kwargs),
        operation=model.operation,
        parent=await model.parent.to_dict(
            current_user=current_user,
            **kwargs,
        ) if model.parent else None,
        resource=model.resource,
        uuid=model.get_uuid(),
        version=model.version,
    )


class BaseModel(ABC):
    category: Union[ComponentCategory, PageCategory] = None
    disabled_override: bool = None
    enabled_override: bool = None
    operation: OperationType = None
    parent: Union['ClientPage', 'PageComponent'] = None
    resource: ResourceType = None
    uuid: str = None
    uuid_from_name: bool = False
    version: Union[int, str] = None

    @classmethod
    def get_uuid(self) -> str:
        return get_uuid(self)

    @classmethod
    async def components(self, current_user: User = None, **kwargs) -> List['BaseModel']:
        return []

    @classmethod
    async def disabled(self, current_user: User = None, **kwargs) -> bool:
        return self.disabled_override

    @classmethod
    async def enabled(self, current_user: User = None, **kwargs) -> bool:
        return self.enabled_override

    @classmethod
    async def metadata(self, current_user: User = None, **kwargs) -> Dict:
        return {}

    @classmethod
    async def to_dict(self, current_user: User = None, **kwargs) -> Dict:
        return await to_dict(self, current_user=current_user, **kwargs)


@dataclass
class DynamicBaseModel:
    category: Union[ComponentCategory, PageCategory] = None
    disabled_override: bool = None
    enabled_override: bool = None
    operation: OperationType = None
    parent: Union['ClientPage', 'PageComponent'] = None
    resource: ResourceType = None
    uuid: str = None
    uuid_from_name: bool = False
    version: Union[int, str] = None

    def get_uuid(self) -> str:
        return get_uuid(self)

    async def components(self, current_user: User = None, **kwargs) -> List['BaseModel']:
        return []

    async def disabled(self, current_user: User = None, **kwargs) -> bool:
        return self.disabled_override

    async def enabled(self, current_user: User = None, **kwargs) -> bool:
        return self.enabled_override

    async def metadata(self, current_user: User = None, **kwargs) -> Dict:
        return {}

    async def to_dict(self, current_user: User = None, **kwargs) -> Dict:
        return await to_dict(self, current_user=current_user, **kwargs)


class PageComponent(BaseModel):
    pass


class ClientPage(BaseModel):
    pass
