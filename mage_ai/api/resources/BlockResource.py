import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block import BlockCache
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.cache.block_action_object.constants import (
    OBJECT_TYPE_BLOCK_FILE,
    OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE,
    OBJECT_TYPE_MAGE_TEMPLATE,
)
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.block.utils import (
    clean_name,
    is_dynamic_block,
    is_dynamic_block_child,
    should_reduce_output,
)
from mage_ai.data_preparation.models.constants import (
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
    BlockLanguage,
    BlockType,
)
from mage_ai.data_preparation.models.custom_templates.custom_block_template import (
    CustomBlockTemplate,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.utils.block.convert_content import convert_to_block
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.settings.repo import get_repo_path
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class BlockResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        block_dicts_by_uuid = {}
        sources_destinations_by_block_uuid = {}

        if isinstance(parent_model, Pipeline):
            for block_uuid, block in parent_model.blocks_by_uuid.items():
                block_dicts_by_uuid[block_uuid] = block.to_dict()

        if isinstance(parent_model, PipelineRun):
            block_mapping = {}

            pipeline = parent_model.pipeline
            for block_run in parent_model.block_runs:
                block_run_block_uuid = block_run.block_uuid
                if block_run_block_uuid not in block_mapping:
                    block_mapping[block_run_block_uuid] = dict(
                        block_run=block_run,
                        uuids=[],
                    )

                # Handle dynamic blocks and data integration blocks
                block = pipeline.get_block(block_run_block_uuid)
                if not block:
                    continue

                block_dict = block.to_dict()
                if 'tags' not in block_dict:
                    block_dict['tags'] = []
                block_dict['uuid'] = block_run_block_uuid

                metrics = block_run.metrics
                if metrics and block.is_data_integration():
                    child = metrics.get('child')
                    controller = metrics.get('controller')
                    controller_block_uuid = metrics.get('controller_block_uuid')
                    original = metrics.get('original')
                    original_block_uuid = metrics.get('original_block_uuid')

                    tags = []

                    if original:
                        if BlockType.DATA_LOADER == block.type:
                            block_dict['description'] = 'Source'
                        elif BlockType.DATA_EXPORTER == block.type:
                            block_dict['description'] = 'Destination'
                    elif controller and not child:
                        block_dict['description'] = 'Controller'
                    else:
                        block_dict['name'] = original_block_uuid

                    if child:
                        parts = block_run_block_uuid.split(':')

                        source_destination = None
                        stream = None
                        index = None

                        if len(parts) >= 2:
                            source_destination = parts[1]

                            for b_uuid in [
                                controller_block_uuid,
                                original_block_uuid,
                            ]:
                                if b_uuid not in sources_destinations_by_block_uuid:
                                    sources_destinations_by_block_uuid[b_uuid] = []

                                if source_destination not in \
                                        sources_destinations_by_block_uuid[b_uuid]:

                                    sources_destinations_by_block_uuid[b_uuid].append(
                                        source_destination,
                                    )

                        if len(parts) >= 3:
                            stream = parts[2]

                        block_mapping[block_run_block_uuid]['uuids'].append(controller_block_uuid)

                        if controller:
                            block_dict['description'] = 'Controller'
                        else:
                            if len(parts) >= 4:
                                index = str(parts[3])

                            block_dict['description'] = index

                            if original_block_uuid not in block_mapping:
                                block_mapping[original_block_uuid] = dict(uuids=[])
                            block_mapping[original_block_uuid]['uuids'].append(
                                block_run_block_uuid,
                            )

                        tags.append(stream)

                    if tags:
                        block_dict['tags'] = tags

                # If dynamic child, then it has many other blocks.
                if is_dynamic_block_child(block):
                    parts = block_run_block_uuid.split(':')

                    # [block_uuid]:[index_1]:[index_2]...:[index_N]
                    parts_length = len(parts)
                    if parts_length >= 2:
                        block_dict['description'] = ':'.join(parts[1:])

                        e_i = parts_length - 1
                        parts_new = parts[1:e_i]

                        for upstream_block in block.upstream_blocks:
                            if is_dynamic_block_child(upstream_block):
                                parts_new = [upstream_block.uuid] + parts_new
                                block_mapping[block_run_block_uuid]['uuids'].append(
                                    ':'.join(parts_new),
                                )

                    # If it should reduce, then all the children have 1 downstream.
                    if should_reduce_output(block):
                        for db in block.downstream_blocks:
                            if db.uuid not in block_mapping:
                                block_mapping[db.uuid] = dict(uuids=[])

                            block_mapping[db.uuid]['uuids'].append(block_run_block_uuid)
                    else:
                        # If not reduce, then there will be multiple instances of
                        # its downstream blocks.
                        for db in block.downstream_blocks:
                            db_uuid = ':'.join([db.uuid] + parts[1:])
                            if db_uuid not in block_mapping:
                                block_mapping[db_uuid] = dict(uuids=[])
                            block_mapping[db_uuid]['uuids'].append(block_run_block_uuid)

                if block.replicated_block:
                    block_dict['name'] = block.replicated_block
                    block_dict['description'] = block.uuid

                block_dict['tags'] += block.tags()

                block_dicts_by_uuid[block_run_block_uuid] = block_dict

            for block_uuid, mapping in block_mapping.items():
                block = pipeline.get_block(block_uuid)
                if not block:
                    continue

                if block_uuid not in block_dicts_by_uuid:
                    continue

                block_run = mapping.get('block_run')
                metrics = block_run.metrics if block_run else None
                upstream_block_uuids = mapping['uuids']

                child = False
                controller = False
                original = False
                is_data_integration = block.is_data_integration()
                if metrics and is_data_integration:
                    child = metrics.get('child')
                    controller = metrics.get('controller')
                    original = metrics.get('original')

                    if original:
                        # The original block should only have upstreams that are
                        # child blocks and not controllers.
                        block_dicts_by_uuid[block_uuid]['upstream_blocks'] = []

                    if original or (controller and not child):
                        if block_uuid in sources_destinations_by_block_uuid:
                            if 'tags' not in block_dicts_by_uuid[block_uuid]:
                                block_dicts_by_uuid[block_uuid] = []
                            block_dicts_by_uuid[block_uuid]['tags'].append(
                                sources_destinations_by_block_uuid[block_uuid],
                            )

                for ub_uuid in upstream_block_uuids:
                    if ub_uuid in block_dicts_by_uuid[block_uuid]['upstream_blocks']:
                        continue

                    if is_data_integration:
                        # A child can only have 1 upstream: the controller that made it.
                        if child:
                            block_dicts_by_uuid[block_uuid]['upstream_blocks'] = [ub_uuid]
                            continue
                        elif original:
                            block_dicts_by_uuid[block_uuid]['upstream_blocks'].append(ub_uuid)
                    else:
                        block_dicts_by_uuid[block_uuid]['upstream_blocks'].append(ub_uuid)

                    ub_block = pipeline.get_block(ub_uuid)
                    # If the upstream block is a dynamic child,
                    # remove the dynamic child block’s original UUID from
                    # the current block’s upstream blocks.
                    if ub_block and \
                            is_dynamic_block_child(ub_block) and \
                            ub_block.uuid in block_dicts_by_uuid[block_uuid]['upstream_blocks']:

                        block_dicts_by_uuid[block_uuid]['upstream_blocks'] = \
                            [uuid for uuid in
                                block_dicts_by_uuid[block_uuid]['upstream_blocks']
                                if uuid != ub_block.uuid]

                for up_block_uuid in block_dicts_by_uuid[block_uuid]['upstream_blocks']:
                    if up_block_uuid not in block_dicts_by_uuid:
                        continue

                    if block_uuid not in block_dicts_by_uuid[up_block_uuid]:
                        if block_uuid not in \
                                block_dicts_by_uuid[up_block_uuid]['downstream_blocks']:

                            block_dicts_by_uuid[up_block_uuid]['downstream_blocks'].append(
                                block_uuid,
                            )

                    up_block = pipeline.get_block(up_block_uuid)
                    if up_block and is_dynamic_block(up_block):
                        for db_block_uuid in \
                                block_dicts_by_uuid[up_block_uuid]['downstream_blocks']:

                            db_block = pipeline.get_block(db_block_uuid)
                            # Remove the original block UUID
                            if db_block and is_dynamic_block_child(db_block):
                                block_dicts_by_uuid[up_block_uuid]['downstream_blocks'] = \
                                    [uuid for uuid in
                                        block_dicts_by_uuid[up_block_uuid]['downstream_blocks']
                                        if uuid != db_block.uuid]

        return self.build_result_set(
            block_dicts_by_uuid.values(),
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    async def create(self, payload, user, **kwargs):
        pipeline = kwargs.get('parent_model')

        block_type = payload.get('type')
        content = payload.get('content')
        language = payload.get('language')
        name = payload.get('name')
        block_name = name or payload.get('uuid')
        require_unique_name = payload.get('require_unique_name')

        payload_config = payload.get('config') or {}

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
            elif OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE == object_type:
                payload_config['custom_template_uuid'] = object_from_cache.get('template_uuid')
            elif OBJECT_TYPE_MAGE_TEMPLATE == object_type:
                block_type = object_from_cache.get('block_type')
                language = object_from_cache.get('language')
                payload_config['template_path'] = object_from_cache.get('path')
                payload_config['template_variables'] = object_from_cache.get('template_variables')

        """
        New DBT models include "content" in its block create payload,
        whereas creating blocks from existing DBT model files do not.
        """
        if payload.get('type') == BlockType.DBT and language == BlockLanguage.SQL and content:
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
            extension_uuid=payload.get('extension_uuid'),
            language=language,
            pipeline=pipeline,
            priority=payload.get('priority'),
            upstream_block_uuids=payload.get('upstream_blocks', []),
        )

        replicated_block = None
        replicated_block_uuid = payload.get('replicated_block')
        if replicated_block_uuid:
            replicated_block = pipeline.get_block(replicated_block_uuid)
            if replicated_block:
                block_type = replicated_block.type
                block_attributes['language'] = replicated_block.language
                block_attributes['replicated_block'] = replicated_block.uuid
            else:
                error = ApiError.RESOURCE_INVALID.copy()
                error.update(
                    message=f'Replicated block {replicated_block_uuid} ' +
                    f'does not exist in pipeline {pipeline.uuid}.',
                )
                raise ApiError(error)

        custom_template = None
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

            block.update_content(content)

        cache = await BlockCache.initialize_cache()
        cache.add_pipeline(block, pipeline)

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

        block_language = query.get('block_language', [None])
        if block_language:
            block_language = block_language[0]
        if block_language:
            language = block_language

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
    async def delete(self, **kwargs):
        query = kwargs.get('query', {})

        force = query.get('force', [False])
        if force:
            force = force[0]

        pipeline = kwargs.get('parent_model')
        cache = await BlockCache.initialize_cache()
        if pipeline:
            cache.remove_pipeline(self.model, pipeline.uuid)

        cache_block_action_object = await BlockActionObjectCache.initialize_cache()
        cache_block_action_object.update_block(self.model, remove=True)

        return self.model.delete(force=force)

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
