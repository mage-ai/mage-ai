from __future__ import annotations

import urllib.parse
from typing import Optional

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.BlockExecutionFrameworkResource import (
    BlockExecutionFrameworkResource,
)
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.PipelineResource import PipelineResource
from mage_ai.frameworks.execution.models.pipeline.adapter import Pipeline
from mage_ai.frameworks.execution.models.pipeline.utils import get_all_frameworks


class PipelineExecutionFrameworkResource(GenericResource):
    @classmethod
    async def collection(cls, query, meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        if parent_model is None:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        pipelines = await Pipeline.load_pipelines(
            execution_framework_uuids=[parent_model.uuid] if parent_model is not None else None
        )
        return cls.build_result_set(
            pipelines,
            user,
            **kwargs,
        )

    @classmethod
    async def get_model(cls, pk: str, **kwargs) -> Optional[Pipeline]:
        execution_framework_uuids = kwargs.get('execution_framework_uuids') or [
            framework.uuid for framework in await get_all_frameworks()
        ]
        pipelines = await Pipeline.load_pipelines(
            execution_framework_uuids=execution_framework_uuids,
            uuids=[urllib.parse.unquote(pk)],
        )
        return pipelines[0] if pipelines and len(pipelines) >= 1 else None

    @classmethod
    async def member(cls, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        if parent_model is None:
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **{
                    'messagemessage': f'Execution framework for {pk} not found.',
                },
            })

        model = await cls.get_model(pk, execution_framework_uuids=[parent_model.uuid], **kwargs)

        if not model:
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **{
                    'message': (
                        f'Pipeline {pk} for execution framework {parent_model.uuid} not found.'
                    ),
                },
            })

        return cls(model, user, **kwargs)

    @classmethod
    async def create(cls, payload, user, **kwargs) -> PipelineExecutionFrameworkResource:
        parent_model = kwargs.get('parent_model')
        if parent_model is None:
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **{
                    'message': 'Execution framework not found.',
                },
            })

        payload['name'] = payload.get('name') or payload.get('uuid')
        payload['uuid'] = payload.get('uuid') or payload.get('name')

        payload['execution_framework'] = str(parent_model.uuid.value)
        res = await PipelineResource.create(payload, user, **kwargs)
        pipeline = res.model

        return cls(
            Pipeline(
                uuid=pipeline.uuid,
                execution_framework=pipeline.execution_framework,
                pipeline=pipeline,
            ),
            user,
            **kwargs,
        )

    async def update(self, payload, **kwargs):
        res = await PipelineResource.member(self.model.uuid, self.current_user, **kwargs)
        await res.update(payload, **kwargs)
        self.model.pipeline = res.model

    async def delete(self, **kwargs):
        adapters = await self.model.get_pipelines()
        for adapter in adapters + [self.model]:
            await PipelineResource(adapter.pipeline, self.current_user, self.model_options).delete(
                **kwargs
            )


PipelineExecutionFrameworkResource.register_child_resource(
    'blocks', BlockExecutionFrameworkResource
)
