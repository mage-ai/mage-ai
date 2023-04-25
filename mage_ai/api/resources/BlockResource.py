from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.block.utils import clean_name
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
)
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.utils.block.convert_content import convert_to_block
from mage_ai.orchestration.db import safe_db_query
import urllib.parse


class BlockResource(GenericResource):
    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        pipeline = kwargs.get('parent_model')

        content = payload.get('content')
        name = payload.get('name')
        language = payload.get('language')
        uuid = clean_name(name)
        """
        New DBT models include "content" in its block create payload,
        whereas creating blocks from existing DBT model files do not.
        """
        if payload.get('type') == BlockType.DBT and content and language == BlockLanguage.SQL:
            dbt_block = DBTBlock(
                name,
                uuid,
                BlockType.DBT,
                configuration=payload.get('configuration'),
                language=language,
            )
            if dbt_block.file_path and dbt_block.file.exists():
                raise Exception('DBT model at that folder location already exists. \
                    Please choose a different model name, or add a DBT model by \
                    selecting single model from file.')

        block = Block.create(
            name or payload.get('uuid'),
            payload.get('type'),
            get_repo_path(),
            color=payload.get('color'),
            config=payload.get('config'),
            configuration=payload.get('configuration'),
            extension_uuid=payload.get('extension_uuid'),
            language=language,
            pipeline=pipeline,
            priority=payload.get('priority'),
            upstream_block_uuids=payload.get('upstream_blocks', []),
        )

        if content:
            if payload.get('converted_from'):
                content = convert_to_block(block, content)

            block.update_content(content)

        return self(block, user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        error = ApiError.RESOURCE_INVALID.copy()

        query = kwargs.get('query', {})

        extension_uuid = query.get('extension_uuid', [None])
        if extension_uuid:
            extension_uuid = extension_uuid[0]

        block_type = query.get('block_type', [None])
        if block_type:
            block_type = block_type[0]

        pipeline = kwargs.get('parent_model')
        if pipeline:
            block = pipeline.get_block(pk, block_type=block_type, extension_uuid=extension_uuid)
            if block:
                return self(block, user, **kwargs)
            else:
                if extension_uuid:
                    message = f'Block {pk} does not exist in pipeline {pipeline.uuid} ' \
                        f'for extension {extension_uuid}.'
                else:
                    message = f'Block {pk} does not exist in pipeline {pipeline.uuid}.'
                error.update(message=message)
                raise ApiError(error)

        block_type_and_uuid = urllib.parse.unquote(pk)
        parts = block_type_and_uuid.split('/')

        if len(parts) < 2:
            error.update(message='The url path should be in block_type/block_uuid format.')
            raise ApiError(error)

        block_type = parts[0]
        block_uuid_with_extension = '/'.join(parts[1:])
        parts2 = block_uuid_with_extension.split('.')
        language = None
        if len(parts2) >= 2:
            block_uuid = '.'.join(parts2[:-1])
            language = FILE_EXTENSION_TO_BLOCK_LANGUAGE[parts2[-1]]
        else:
            block_uuid = block_uuid_with_extension

        if BlockType.DBT == block_type:
            block = DBTBlock(
                block_uuid,
                block_uuid,
                block_type,
                configuration=dict(file_path=block_uuid_with_extension),
                language=language,
            )
        else:
            block = Block.get_block(block_uuid, block_uuid, block_type, language=language)

        if not block.exists():
            error.update(ApiError.RESOURCE_NOT_FOUND)
            raise ApiError(error)

        return self(block, user, **kwargs)

    @safe_db_query
    def delete(self, **kwargs):
        query = kwargs.get('query', {})

        force = query.get('force', [False])
        if force:
            force = force[0]
        return self.model.delete(force=force)

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
