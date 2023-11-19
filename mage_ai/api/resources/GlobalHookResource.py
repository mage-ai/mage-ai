from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    Hook,
    HookOperation,
)
from mage_ai.orchestration.db.models.oauth import User


class GlobalHookResource(GenericResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        operation_types = query.get('operation_type[]', [])
        if operation_types:
            operation_types = operation_types[0]
        if isinstance(operation_types, str):
            operation_types = [HookOperation(m) for m in operation_types.split(',') if m]

        resource_types = query.get('resource_type[]', [])
        if resource_types:
            resource_types = resource_types[0]
        if isinstance(resource_types, str):
            resource_types = [EntityName(m) for m in resource_types.split(',') if m]

        global_hooks = GlobalHooks.load_from_file()

        return self.build_result_set(
            global_hooks.hooks(
                operation_types=operation_types,
                resource_types=resource_types,
            ),
            user,
            **kwargs,
        )

    @classmethod
    async def create(self, payload: Dict, user: User, **kwargs) -> 'GlobalHookResource':
        hook = Hook.load(**payload)

        if not hook.uuid or not hook.resource_type or not hook.operation_type:
            missing = []
            if not hook.resource_type:
                missing.append('resource_type')
            if not hook.operation_type:
                missing.append('operation_type')
            if not hook.uuid:
                missing.append('uuid')

            error = ApiError.RESOURCE_INVALID.copy()
            error.update(
                message=f'Hook is missing the following required attributes: {", ".join(missing)}.',
            )
            raise ApiError(error)

        global_hooks = GlobalHooks.load_from_file()
        if global_hooks.get_hook(
            operation_type=hook.operation_type,
            resource_type=hook.resource_type,
            uuid=hook.uuid,
        ):
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(
                message=f'Hook {hook.uuid} already exists for resource '
                        f'{hook.resource_type} and operation {hook.operation_type}.',
            )
            raise ApiError(error)

        global_hooks.add_hook(hook)
        global_hooks.save()

        return self(hook, user, **kwargs)

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        query = kwargs.get('query') or {}

        resource_type = query.get('resource_type', [None])
        if resource_type:
            resource_type = resource_type[0]

        operation_type = query.get('operation_type', [None])
        if operation_type:
            operation_type = operation_type[0]

        global_hooks = GlobalHooks.load_from_file()
        hook = global_hooks.get_hook(
            operation_type=HookOperation(operation_type) if operation_type else operation_type,
            resource_type=EntityName(resource_type) if resource_type else resource_type,
            uuid=pk,
        )

        if not hook:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return self(hook, user, **kwargs)

    async def update(self, payload: Dict, **kwargs):
        global_hooks = GlobalHooks.load_from_file()
        self.model = global_hooks.add_hook(self.model, payload=payload, update=True)
        global_hooks.save()

    async def delete(self, **kwargs):
        global_hooks = GlobalHooks.load_from_file()
        global_hooks.remove_hook(self.model)
        global_hooks.save()
