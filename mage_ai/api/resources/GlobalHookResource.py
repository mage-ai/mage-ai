import asyncio
from typing import Dict, List

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.api.resources.PipelineResource import PipelineResource
from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.constants import (
    DISABLED_RESOURCE_TYPES,
)
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    Hook,
    HookOperation,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.hash import ignore_keys


class GlobalHookResource(AsyncBaseResource):
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

        root_project = query.get('root_project', [False])
        if root_project:
            root_project = root_project[0]

        global_hooks = GlobalHooks.load_from_file(
            all_global_hooks=False,
            repo_path=base_repo_path() if root_project else None,
        )

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
        query = kwargs.get('query') or {}

        root_project = query.get('root_project', [False])
        if root_project:
            root_project = root_project[0]
        if not root_project:
            root_project = payload.get('root_project')

        if user and user.id:
            payload['metadata'] = dict(
                user=dict(
                    id=user.id,
                ),
            )

        hook = Hook.load(**ignore_keys(payload, ['root_project']))

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

        if hook.resource_type and hook.resource_type in DISABLED_RESOURCE_TYPES:
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(
                message=f'Hooks cannot be created for resource type {hook.resource_type.value}.',
            )
            raise ApiError(error)

        global_hooks = GlobalHooks.load_from_file(
            all_global_hooks=False,
            repo_path=base_repo_path() if root_project else None,
        )
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

        global_hooks.add_hook(hook, snapshot=True)
        global_hooks.save(repo_path=base_repo_path() if root_project else None)

        return self(hook, user, **kwargs)

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        query = kwargs.get('query') or {}

        resource_type = query.get('resource_type', [None])
        if resource_type:
            resource_type = resource_type[0]

        root_project = query.get('root_project', [False])
        if root_project:
            root_project = root_project[0]

        operation_type = query.get('operation_type', [None])
        if operation_type:
            operation_type = operation_type[0]

        include_operation_types = query.get('include_operation_types', [None])
        if include_operation_types:
            include_operation_types = include_operation_types[0]

        include_resource_types = query.get('include_resource_types', [None])
        if include_resource_types:
            include_resource_types = include_resource_types[0]

        global_hooks = GlobalHooks.load_from_file(
            all_global_hooks=False,
            repo_path=base_repo_path() if root_project else None,
        )
        hook = global_hooks.get_hook(
            operation_type=HookOperation(operation_type) if operation_type else operation_type,
            resource_type=EntityName(resource_type) if resource_type else resource_type,
            uuid=pk,
        )

        if not hook and not include_operation_types and not include_resource_types:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return self(hook, user, **kwargs)

    async def update(self, payload: Dict, **kwargs):
        query = kwargs.get('query') or {}

        root_project = query.get('root_project', [False])
        if root_project:
            root_project = root_project[0]

        global_hooks = GlobalHooks.load_from_file(
            all_global_hooks=False,
            repo_path=base_repo_path() if root_project else None,
        )
        self.model = global_hooks.add_hook(
            self.model,
            payload=ignore_keys(payload, ['root_project', 'snapshot']),
            snapshot=payload.get('snapshot') or False,
            update=True,
        )
        global_hooks.save(repo_path=base_repo_path() if root_project else None)

    async def delete(self, **kwargs):
        query = kwargs.get('query') or {}

        root_project = query.get('root_project', [False])
        if root_project:
            root_project = root_project[0]

        global_hooks = GlobalHooks.load_from_file(
            all_global_hooks=False,
            repo_path=base_repo_path() if root_project else None,
        )

        global_hooks.remove_hook(self.model)
        global_hooks.save(repo_path=base_repo_path() if root_project else None)


async def __load_pipelines(resource: GlobalHookResource):
    pipeline_uuids = []
    for res in resource.result_set():
        if res.model.pipeline_settings and res.model.pipeline_settings.get('uuid'):
            pipeline_uuid = res.model.pipeline_settings.get('uuid')
            if pipeline_uuid:
                pipeline_uuids.append(pipeline_uuid)

    async def get_pipeline(uuid):
        try:
            return await Pipeline.get_async(uuid)
        except Exception as err:
            err_message = f'Error loading pipeline {uuid}: {err}.'
            if err.__class__.__name__ == 'OSError' and 'Too many open files' in err.strerror:
                raise Exception(err_message)
            else:
                print(err_message)
                return None

    pipelines = await asyncio.gather(
        *[get_pipeline(uuid) for uuid in pipeline_uuids]
    )
    pipelines = [p for p in pipelines if p is not None]

    return PipelineResource.build_result_set(pipelines, resource.current_user)


async def __find_pipeline(resource: GlobalHookResource, arr: List[PipelineResource]):
    pipeline_uuid = resource.model.pipeline_settings and resource.model.pipeline_settings.get(
        'uuid',
    )

    if not pipeline_uuid:
        return

    return find(
        lambda x, pipeline_uuid=pipeline_uuid: x.uuid == pipeline_uuid,
        arr,
    )


GlobalHookResource.register_collective_loader(
    'pipeline_details',
    load=__load_pipelines,
    select=__find_pipeline,
)
