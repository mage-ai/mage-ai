from __future__ import annotations

import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.BlockResource import BlockResource
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.frameworks.execution.models.block.adapter import Block
from mage_ai.shared.array import find


class BlockExecutionFrameworkResource(GenericResource):
    @classmethod
    async def member(cls, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        if parent_model is None:
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **{
                    'messagemessage': f'Pipeline for {pk} not found.',
                },
            })

        blocks = await parent_model.get_blocks(refresh=True)
        model = find(lambda block: block.uuid == urllib.parse.unquote(pk), blocks)

        if not model:
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **{
                    'message': (f'Block {pk} for pipeline {parent_model.uuid} not found.'),
                },
            })

        return cls(model, user, **kwargs)

    @classmethod
    async def create(cls, payload, user, **kwargs) -> BlockExecutionFrameworkResource:
        parent_model = kwargs.get('parent_model')
        if parent_model is None:
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **{
                    'message': 'Pipeline not found.',
                },
            })

        config = Block.preprocess_config(
            payload.get('name') or payload.get('uuid'),
            parent_model,
            payload,
        )
        res = await BlockResource.create(config, user, **kwargs)
        block = Block(res.model, parent_model)
        await parent_model.add_block(
            block, upstream_block_uuids=config.get('upstream_block_uuids', [])
        )
        resource = cls(block, user, **kwargs)
        await parent_model.get_pipeline(refresh=True)
        resource.model.pipeline = parent_model
        return resource

    async def update(self, payload, **kwargs):
        parent_model = kwargs.get('parent_model')
        if parent_model is not None:
            if payload.get('configuration'):
                await parent_model.update_block_configuration(self.model, payload['configuration'])
                await parent_model.get_blocks(refresh=True)
            elif 'downstream_blocks' in payload:
                await parent_model.update_downstream_blocks(
                    self.model,
                    payload['downstream_blocks'],
                )
                await parent_model.get_blocks(refresh=True)

    async def delete(self, **kwargs):
        parent_model = kwargs.get('parent_model')
        res = BlockResource.member(self.model.uuid, self.current_user, **kwargs)
        kwargs['query'] = kwargs.get('query') or {}
        kwargs['query']['force'] = [True]
        await res.delete(**kwargs)
        if parent_model:
            await parent_model.get_pipeline(refresh=True)
            self.model.pipeline = parent_model
