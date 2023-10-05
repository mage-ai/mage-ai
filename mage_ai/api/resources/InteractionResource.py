import asyncio
import os
import urllib.parse
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.presenters.interactions.models import Interaction
from mage_ai.shared.environments import is_debug
from mage_ai.shared.hash import extract
from mage_ai.shared.utils import clean_name


class InteractionResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        pipeline_interaction = kwargs.get('parent_model')
        interactions = []

        async def load_interaction(uuid) -> Dict:
            interaction = Interaction(uuid, pipeline=pipeline_interaction.pipeline)

            try:
                return await interaction.to_dict(include_content=True)
            except Exception as err:
                if is_debug():
                    print(f'[WARNING] InteractionResource.collection: {err}')

        if pipeline_interaction:
            interaction_uuids = await pipeline_interaction.interaction_uuids()
            interactions += await asyncio.gather(
                *[load_interaction(uuid) for uuid in interaction_uuids],
            )

        return self.build_result_set(interactions, user, **kwargs)

    @classmethod
    @safe_db_query
    async def create(self, payload, user, **kwargs):
        pipeline_interaction = kwargs.get('parent_model')
        uuid = clean_name(payload.get('uuid') or '', allow_characters=[
            '.',
            os.path.sep,
        ])

        interaction = Interaction(
            uuid=uuid,
            pipeline=pipeline_interaction.pipeline if pipeline_interaction else None,
        )

        if interaction.exists():
            error = ApiError.RESOURCE_INVALID.copy()
            error['message'] = f'Interaction {uuid} already exists.'
            raise ApiError(error)

        payload_update = {}
        if 'content' in payload:
            payload_update['content'] = payload.get('content')
        else:
            payload_update['content_parsed'] = extract(payload, [
                'inputs',
                'layout',
                'variables',
            ])

        await interaction.update(**payload_update)

        block_uuid = payload.get('block_uuid')
        if block_uuid and pipeline_interaction:
            await pipeline_interaction.add_interaction_to_block(
                block_uuid,
                interaction,
            )

        return self(interaction, user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        uuid = urllib.parse.unquote(pk)
        pipeline = kwargs.get('parent_model')
        model = Interaction(uuid, pipeline=pipeline)

        if not model.exists():
            error = ApiError.RESOURCE_NOT_FOUND.copy()
            error['message'] = f'Interaction {uuid} doesn’t exist.'
            raise ApiError(error)

        return self(model, user, **kwargs)

    def delete(self, **kwargs):
        self.model.delete()

    async def update(self, payload, **kwargs):
        payload_update = {}
        if 'content' in payload:
            payload_update['content'] = payload.get('content')
        else:
            payload_update['content_parsed'] = extract(payload, [
                'inputs',
                'layout',
                'variables',
            ])

        await self.model.update(**payload_update)
