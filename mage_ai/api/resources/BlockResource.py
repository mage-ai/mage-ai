import os
import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import META_KEY_LIMIT, META_KEY_OFFSET
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block import BlockCache
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.cache.block_action_object.constants import (
    OBJECT_TYPE_BLOCK_FILE,
    OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE,
    OBJECT_TYPE_MAGE_TEMPLATE,
)
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.utils import clean_name
from mage_ai.data_preparation.models.constants import (
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
    BlockLanguage,
    BlockType,
)
from mage_ai.data_preparation.models.custom_templates.custom_block_template import (
    CustomBlockTemplate,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.templates.data_integrations.constants import (
    TEMPLATE_TYPE_DATA_INTEGRATION,
)
from mage_ai.data_preparation.utils.block.convert_content import convert_to_block
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.presenters.blocks.graph import build_blocks_for_pipeline_run
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class BlockResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        block_uuids = query_arg.get('block_uuid[]', [])
        if block_uuids:
            block_uuids = block_uuids[0]
        if block_uuids:
            block_uuids = set(block_uuids.split(','))

        block_dicts_by_uuid = {}

        if isinstance(parent_model, Pipeline):
            for block_uuid, block in parent_model.blocks_by_uuid.items():
                if not block_uuids or block_uuid in block_uuids:
                    block_dicts_by_uuid[block_uuid] = block.to_dict()

        if isinstance(parent_model, PipelineRun):
            block_dicts_by_uuid = build_blocks_for_pipeline_run(
                parent_model,
                block_uuids,
            )

        return self.build_result_set(
            block_dicts_by_uuid.values(),
            user,
            **kwargs,
        )

    @classmethod
    async def process_collection(self, query_arg, meta, user, **kwargs):
        total_results = self.collection(query_arg, meta, user, **kwargs)
        total_count = len(total_results)

        limit = int((meta or {}).get(META_KEY_LIMIT, 0))
        offset = int((meta or {}).get(META_KEY_OFFSET, 0))

        final_results = total_results
        has_next = False
        if limit > 0:
            start_idx = offset
            end_idx = start_idx + limit

            results = total_results[start_idx:(end_idx + 1)]

            results_size = len(results)
            has_next = results_size > limit
            final_end_idx = results_size - 1 if has_next else results_size
            final_results = results[0:final_end_idx]

        result_set = self.build_result_set(
            final_results,
            user,
            **kwargs,
        )
        result_set.metadata = {
            'count': total_count,
            'next': has_next,
        }
        return result_set

    @classmethod
    @safe_db_query
    async def create(self, payload, user, **kwargs):
        pipeline = kwargs.get('parent_model')
        block = None

        block_type = payload.get('type')
        content = payload.get('content')
        language = payload.get('language')
        name = payload.get('name')
        block_name = name or payload.get('uuid')
        require_unique_name = payload.get('require_unique_name')

        payload_config = payload.get('config') or {}
        replicated_block = None
        custom_template = None

        block_action_object = payload.get('block_action_object')
        if block_action_object:
            object_type = block_action_object.get('object_type')

            cache_block_action_object = await BlockActionObjectCache.initialize_cache()
            mapping = cache_block_action_object.load_all_data()
            objects_mapping = mapping.get(object_type)
            object_uuid = block_action_object.get('uuid')
            object_from_cache = objects_mapping.get(object_uuid)

            if OBJECT_TYPE_BLOCK_FILE == object_type:
                block_name = object_from_cache.get('uuid')
                block_type = object_from_cache.get('type')
                language = object_from_cache.get('language')

                file_path = object_from_cache.get('file_path')
                block = Block.get_block_from_file_path(urllib.parse.unquote(file_path))
                if block:
                    if pipeline:
                        pipeline.add_block(block)
            elif OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE == object_type:
                payload_config['custom_template_uuid'] = object_from_cache.get('template_uuid')
            elif OBJECT_TYPE_MAGE_TEMPLATE == object_type:
                block_type = object_from_cache.get('block_type')
                payload_config['template_path'] = object_from_cache.get('path')

                if TEMPLATE_TYPE_DATA_INTEGRATION != object_from_cache.get('template_type'):
                    language = object_from_cache.get('language')

                for key in [
                    'template_type',
                    'template_variables',
                ]:
                    if object_from_cache.get(key):
                        payload_config[key] = object_from_cache.get(key)

                payload['configuration'] = merge_dict(
                    payload.get('configuration') or {},
                    object_from_cache.get('configuration') or {},
                )

        if block is None:
            """
            New DBT models include "content" in its block create payload,
            whereas creating blocks from existing DBT model files do not.
            """
            if payload.get('type') == BlockType.DBT and language == BlockLanguage.SQL and content:
                from mage_ai.data_preparation.models.block.dbt import DBTBlock

                dbt_block = DBTBlock(
                    name,
                    clean_name(name),
                    BlockType.DBT,
                    configuration=payload.get('configuration'),
                    language=language,
                )
                if dbt_block.file_path and dbt_block.file.exists():
                    raise Exception('DBT model at that folder location already exists. \
                        Please choose a different model name, or add a DBT model by \
                        selecting single model from file.')

            block_attributes = dict(
                color=payload.get('color'),
                config=payload_config,
                configuration=payload.get('configuration'),
                downstream_block_uuids=payload.get('downstream_blocks', []),
                extension_uuid=payload.get('extension_uuid'),
                language=language,
                pipeline=pipeline,
                priority=payload.get('priority'),
                upstream_block_uuids=payload.get('upstream_blocks', []),
            )

            replicated_block_uuid = payload.get('replicated_block')
            if replicated_block_uuid:
                replicated_block = pipeline.get_block(replicated_block_uuid)
                if replicated_block:
                    block_type = replicated_block.type
                    # You can replicate a replica but it’ll only replicate the original block.
                    replicated_block = replicated_block.get_original_block() or replicated_block
                    block_attributes['configuration'] = replicated_block.configuration
                    block_attributes['language'] = replicated_block.language
                    block_attributes['replicated_block'] = replicated_block.uuid
                else:
                    error = ApiError.RESOURCE_INVALID.copy()
                    error.update(
                        message=f'Replicated block {replicated_block_uuid} ' +
                        f'does not exist in pipeline {pipeline.uuid}.',
                    )
                    raise ApiError(error)

            if payload_config and payload_config.get('custom_template_uuid'):
                template_uuid = payload_config.get('custom_template_uuid')
                custom_template = CustomBlockTemplate.load(template_uuid=template_uuid)
                block = custom_template.create_block(
                    block_name,
                    pipeline,
                    extension_uuid=block_attributes.get('extension_uuid'),
                    priority=block_attributes.get('priority'),
                    upstream_block_uuids=block_attributes.get('upstream_block_uuids'),
                )
                content = custom_template.load_template_content()
            else:
                block = Block.create(
                    block_name,
                    block_type,
                    get_repo_path(),
                    require_unique_name=require_unique_name,
                    **block_attributes,
                )

            if content:
                if payload.get('converted_from'):
                    content = convert_to_block(block, content)

                await block.update_content_async(content)

        if pipeline:
            cache = await BlockCache.initialize_cache()
            cache.add_pipeline(block.to_dict(), pipeline)

        cache_block_action_object = await BlockActionObjectCache.initialize_cache()
        cache_block_action_object.update_block(block)

        if block:
            await UsageStatisticLogger().block_create(
                block,
                block_action_object=block_action_object,
                custom_template=custom_template,
                payload_config=payload_config,
                pipeline=pipeline,
                replicated_block=replicated_block,
            )

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
            pk = urllib.parse.unquote(pk)
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

        file_path = query.get('file_path', [None])
        if file_path:
            file_path = file_path[0]
        if file_path:
            try:
                block = Block.get_block_from_file_path(urllib.parse.unquote(file_path))
            except Exception as err:
                print(f'[ERROR] BlockResource.member: {err}')
                block = None

            if block:
                return self(block, user, **kwargs)
            else:
                error.update(ApiError.RESOURCE_NOT_FOUND)
                raise ApiError(error)

        block_type_and_uuid = urllib.parse.unquote(pk)
        parts = block_type_and_uuid.split('/')

        if len(parts) < 2:
            error.update(message='The url path should be in block_type/block_uuid format.')
            raise ApiError(error)

        block_type = parts[0]
        block_uuid_with_extension = os.path.sep.join(parts[1:])
        parts2 = block_uuid_with_extension.split('.')

        language = None
        if len(parts2) >= 2:
            block_uuid = '.'.join(parts2[:-1])
            language = FILE_EXTENSION_TO_BLOCK_LANGUAGE[parts2[-1]]
        else:
            block_uuid = block_uuid_with_extension

        block_language = query.get('block_language', [None])
        if block_language:
            block_language = block_language[0]
        if block_language:
            language = block_language

        if BlockType.DBT == block_type:
            from mage_ai.data_preparation.models.block.dbt import DBTBlock

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
    async def delete(self, **kwargs):
        query = kwargs.get('query', {})

        force = query.get('force', [False])
        if force:
            force = force[0]

        pipeline = kwargs.get('parent_model')

        blocks_to_delete = [self.model]
        for block in pipeline.blocks_by_uuid.values():
            if block.replicated_block == self.model.uuid:
                blocks_to_delete.append(block)

        cache = await BlockCache.initialize_cache()
        cache_block_action_object = await BlockActionObjectCache.initialize_cache()

        for block in blocks_to_delete:
            if pipeline:
                cache.remove_pipeline(block.to_dict(), pipeline.uuid, pipeline.repo_path)
            cache_block_action_object.update_block(block, remove=True)
            block.delete(force=force)

    @safe_db_query
    async def update(self, payload, **kwargs):
        cache_block_action_object = await BlockActionObjectCache.initialize_cache()
        cache_block_action_object.update_block(self.model, remove=True)

        query = kwargs.get('query', {})
        update_state = query.get('update_state', [False])
        if update_state:
            update_state = update_state[0]
        self.model.update(
            payload,
            update_state=update_state,
        )

        cache_block_action_object.update_block(self.model)

    async def get_pipelines_from_cache(self):
        await BlockCache.initialize_cache()

        return self.model.get_pipelines_from_cache()
