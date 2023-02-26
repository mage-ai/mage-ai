from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.data_preparation.models.widget import Widget
from mage_ai.data_preparation.repo_manager import get_repo_path
from typing import Dict
import asyncio


class WidgetResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        pipeline = kwargs['parent_model']

        include_outputs = query.get('include_outputs', [True])
        if include_outputs:
            include_outputs = include_outputs[0]

        collection = await asyncio.gather(
            *[widget.to_dict_async(
                include_content=True,
                include_outputs=include_outputs,
              ) for widget in pipeline.widgets_by_uuid.values()]
        )

        return self.build_result_set(
            collection,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload: Dict, user, **kwargs) -> 'WidgetResource':
        pipeline = kwargs['parent_model']

        resource = Widget.create(
            payload.get('name') or payload.get('uuid'),
            payload.get('type'),
            get_repo_path(),
            config=payload.get('config'),
            language=payload.get('language'),
            pipeline=pipeline,
            priority=payload.get('priority'),
            upstream_block_uuids=payload.get('upstream_blocks', []),
        )

        if payload.get('content'):
            resource.update_content(payload['content'], widget=True)

        if payload.get('configuration'):
            resource.configuration = payload['configuration']
            pipeline.save()

        return self(resource, user, **kwargs)

    @classmethod
    @safe_db_query
    async def member(self, pk, user, **kwargs):
        pipeline = kwargs['parent_model']
        widget = pipeline.get_block(pk, widget=True)

        error = ApiError.RESOURCE_NOT_FOUND.copy()
        if widget is None:
            error.update(message=f'Widget {pk} does not exist in pipeline {pipeline.uuid}.')
            raise ApiError(error)

        return self(widget, user, **kwargs)

    @safe_db_query
    def delete(self, **kwargs):
        self.model.delete()
        return self

    @safe_db_query
    def update(self, payload, **kwargs):
        self.model.update(payload)
        if payload.get('configuration'):
            self.model.configuration = payload['configuration']
            self.parent_model.save()
        return self
