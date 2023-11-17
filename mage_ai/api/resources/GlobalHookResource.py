from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.global_hooks.models import GlobalHooks, Hook
from mage_ai.orchestration.db.models.oauth import User


class GlobalHookResource(GenericResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        # query = kwargs.get('query') or {}

        # resources = query.get('resources[]', [])
        # operations = query.get('operations[]', [])

        global_hooks = GlobalHooks.load_from_file()

        return self.build_result_set(
            global_hooks.hooks(),
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

        resource = query.get('resource', [None])
        if resource:
            resource = resource[0]

        operation = query.get('operation', [None])
        if operation:
            operation = operation[0]

        global_hooks = GlobalHooks.load_from_file()
        hook = global_hooks.get_hook(
            operation_type=operation,
            resource_type=resource,
            uuid=pk,
        )

        if not hook:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return self(hook, user, **kwargs)

    async def update(self, payload: Dict, **kwargs):
        pass

    async def delete(self, **kwargs):
        pass
