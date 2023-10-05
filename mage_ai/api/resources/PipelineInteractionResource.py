import urllib.parse

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.InteractionResource import InteractionResource
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.pipelines.interactions import PipelineInteractions
from mage_ai.orchestration.db import safe_db_query
from mage_ai.shared.hash import extract, merge_dict


class PipelineInteractionResource(GenericResource):
    @classmethod
    @safe_db_query
    async def get_model(self, pk):
        uuid = urllib.parse.unquote(pk)
        pipeline = await Pipeline.get_async(uuid)
        return PipelineInteractions(pipeline)

    @classmethod
    @safe_db_query
    async def member(self, pk, user, **kwargs):
        model = await self.get_model(pk)

        query = kwargs.get('query', {})
        filter_for_permissions = query.get('filter_for_permissions', [False])
        if filter_for_permissions:
            filter_for_permissions = filter_for_permissions[0]

        if filter_for_permissions:
            await model.filter_for_permissions(user)

        return self(model, user, **kwargs)

    async def update(self, payload, **kwargs):
        payload_update = {}
        if 'content' in payload:
            payload_update['content'] = payload.get('content')
        else:
            payload_update['content_parsed'] = extract(payload, [
                'blocks',
                'layout',
                'permissions',
            ])

        await self.model.update(**payload_update)

        interactions = payload.get('interactions') or {}
        if interactions:
            for interaction_uuid, interaction in interactions.items():
                resource = InteractionResource.member(
                    interaction_uuid,
                    self.current_user,
                    **merge_dict(kwargs, dict(
                        parent_model=self.model.pipeline,
                    )),
                )

                await resource.update(extract(interaction, [
                    'inputs',
                    'layout',
                    'variables',
                ]))
