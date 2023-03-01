from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import FILE_EXTENSION_TO_BLOCK_LANGUAGE
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.utils.block.convert_content import convert_to_block
from mage_ai.orchestration.db import safe_db_query
import urllib.parse


class BlockResource(GenericResource):
    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        pipeline = kwargs.get('parent_model')

        block = Block.create(
            payload.get('name') or payload.get('uuid'),
            payload.get('type'),
            get_repo_path(),
            color=payload.get('color'),
            config=payload.get('config'),
            configuration=payload.get('configuration'),
            language=payload.get('language'),
            pipeline=pipeline,
            priority=payload.get('priority'),
            upstream_block_uuids=payload.get('upstream_blocks', []),
        )

        content = payload.get('content')
        if content:
            if payload.get('converted_from'):
                content = convert_to_block(block, content)

            block.update_content(content)

        return self(block, user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        error = ApiError.RESOURCE_INVALID.copy()

        pipeline = kwargs.get('parent_model')
        if pipeline:
            block = pipeline.get_block(pk)
            if block:
                return self(block, user, **kwargs)
            else:
                error.update(message=f'Block {pk} does not exist in pipeline {pipeline.uuid}.')
                raise ApiError(error)

        block_type_and_uuid = urllib.parse.unquote(pk)
        parts = block_type_and_uuid.split('/')

        if len(parts) < 2:
            error.update(message='The url path should be in block_type/block_uuid format.')
            raise ApiError(error)

        block_type = parts[0]
        block_uuid = '/'.join(parts[1:])
        parts2 = block_uuid.split('.')
        language = None
        if len(parts2) >= 2:
            block_uuid = parts2[0]
            language = FILE_EXTENSION_TO_BLOCK_LANGUAGE[parts2[1]]

        block = Block(block_uuid, block_uuid, block_type, language=language)
        if not block.exists():
            error.update(ApiError.RESOURCE_NOT_FOUND)
            raise ApiError(error)

        return self(block, user, **kwargs)

    @safe_db_query
    def delete(self, **kwargs):
        return self.model.delete()

    @safe_db_query
    def update(self, payload, **kwargs):
        query = kwargs.get('query', {})
        update_state = query.get('update_state', [False])
        if update_state:
            update_state = update_state[0]
        self.model.update(
            payload,
            update_state=update_state,
        )
