from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import MetaKey
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.kernels.magic.environments.models import OutputManager
from mage_ai.shared.path_fixer import remove_base_repo_directory_name


class ExecutionOutputResource(GenericResource):
    @classmethod
    async def collection(cls, query, _meta, user, **kwargs):
        path = query.get('path')
        if path:
            path = path[0]

        if path is None:
            raise ApiError({
                **ApiError.RESOURCE_INVALID,
                **dict(message='Path query parameter is required'),
            })

        namespace = query.get('namespace')
        if namespace:
            namespace = namespace[0]

        if namespace is None:
            raise ApiError({
                **ApiError.RESOURCE_INVALID,
                **dict(message='Namespace query parameter is required'),
            })

        outputs = await OutputManager.load_with_messages(
            remove_base_repo_directory_name(path),
            namespace,
        )

        return cls.build_result_set(outputs, user, **kwargs)

    @classmethod
    async def member(cls, pk, user, **kwargs):
        query = kwargs.get('query') or {}

        path = query.get('path')
        if path:
            path = path[0]

        if path is None:
            raise ApiError({
                **ApiError.RESOURCE_INVALID,
                **dict(message='Path query parameter is required'),
            })

        namespace = query.get('namespace')
        if namespace:
            namespace = namespace[0]

        if namespace is None:
            raise ApiError({
                **ApiError.RESOURCE_INVALID,
                **dict(message='Namespace query parameter is required'),
            })

        om = OutputManager.load(
            namespace=namespace, path=remove_base_repo_directory_name(path), uuid=pk
        )
        if not await om.exists():
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **dict(message=f'Output {om.absolute_path} not found'),
            })

        model = await om.build_output()
        limit = kwargs.get('meta', {}).get(MetaKey.LIMIT)
        await model.load_output(
            limit=int(limit) if limit is not None else None,
        )

        return cls(model, user, **kwargs)

    async def delete(self, payload: Dict, **kwargs):
        if payload.get('all'):
            await OutputManager.delete_output_batch(self.model.path, self.model.namespace)
        else:
            await self.model.delete()
