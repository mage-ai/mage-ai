from __future__ import annotations

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.PipelineResource import PipelineResource
from mage_ai.frameworks.execution.models.pipeline.adapter import Pipeline
from mage_ai.shared.array import find
from mage_ai.shared.hash import index_by


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
    async def member(cls, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        if parent_model is None:
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **{
                    'messagemessage': f'Execution framework for {pk} not found.',
                },
            })

        pipelines = await Pipeline.load_pipelines(
            framework=parent_model,
            uuids=[pk],
        )

        model = pipelines[0] if pipelines and len(pipelines) >= 1 else None

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
        blocks = await self.model.get_blocks()

        # Add block to pipeline or
        # Update block configuration
        if 'block' in payload:
            block_data = payload['block']
            block = find(lambda b: b.uuid == block_data.get('uuid'), blocks or [])
            if block:
                if block_data.get('configuration'):
                    await self.model.update_block_configuration(block, block_data['configuration'])
            else:
                await self.model.create_block(block_data)
        elif 'blocks' in payload:
            # Remove block from pipeline
            if len(payload['blocks']) < len(blocks):
                mapping = index_by(lambda b: b.get('uuid'), payload['blocks'])
                # Can only delete 1 block at a time
                block = find(lambda b: b.uuid not in mapping, blocks)
                if block:
                    await self.model.remove_block(block)
        else:
            await self.model.update(**payload)

        await self.model.get_blocks(refresh=True)

    async def delete(self, **kwargs):
        adapters = await self.model.get_pipelines()
        for adapter in adapters + [self.model]:
            await PipelineResource(adapter.pipeline, self.current_user, self.model_options).delete(
                **kwargs
            )
