from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.templates.data_integrations.constants import (
    DATA_INTEGRATION_TYPE_DESTINATIONS,
    DATA_INTEGRATION_TYPE_SOURCES,
)
from mage_ai.data_preparation.templates.data_integrations.utils import get_templates
from mage_ai.server.api.integration_sources import build_integration_module_info
from mage_ai.shared.environments import is_debug


class BlockPresenter(BasePresenter):
    default_attributes = [
        'all_upstream_blocks_executed',
        'callback_blocks',
        'color',
        'conditional_blocks',
        'configuration'
        'documentation',
        'downstream_blocks',
        'executor_config',
        'executor_type',
        'groups',
        'has_callback',
        'language',
        'metadata',
        'name',
        'replicated_block',
        'retry_config',
        'status',
        'timeout',
        'type',
        'upstream_blocks',
        'uuid',
    ]

    async def present(self, **kwargs):
        display_format = kwargs['format']

        if display_format in [constants.CREATE, constants.UPDATE]:
            include_block_catalog = self.model.pipeline and \
                    PipelineType.PYTHON == self.model.pipeline and \
                    Project(repo_config=self.model.pipeline.repo_config).is_feature_enabled(
                        FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE,
                    )

            return await self.model.to_dict_async(
                include_block_catalog=include_block_catalog,
                include_content=True,
            )
        elif display_format in [constants.DETAIL, 'dbt']:
            query = kwargs.get('query', {})

            include_outputs = query.get('include_outputs', [True])
            if include_outputs:
                include_outputs = include_outputs[0]

            state_stream = query.get('state_stream', [None])
            if state_stream:
                state_stream = state_stream[0]
            destination_table = query.get('destination_table', [None])
            if destination_table:
                destination_table = destination_table[0]

            include_block_catalog = query.get('include_block_catalog', [False])
            if include_block_catalog:
                include_block_catalog = include_block_catalog[0]

            include_block_metadata = query.get('include_block_metadata', [False])
            if include_block_metadata:
                include_block_metadata = include_block_metadata[0]

            data = await self.model.to_dict_async(
                destination_table=destination_table,
                include_block_catalog=include_block_catalog,
                include_block_metadata=include_block_metadata,
                include_content=True,
                include_outputs=include_outputs,
                state_stream=state_stream,
            )

            include_documentation = query.get('include_documentation', [False])
            if include_documentation:
                include_documentation = include_documentation[0]

            data_integration_uuid = query.get('data_integration_uuid', [None])
            if data_integration_uuid:
                data_integration_uuid = data_integration_uuid[0]

            data_integration_type = query.get('data_integration_type', [None])
            if data_integration_type:
                data_integration_type = data_integration_type[0]

            if include_documentation and self.model.is_data_integration():
                if not data_integration_uuid:
                    try:
                        global_vars = self.model.pipeline.variables if self.model.pipeline else None
                        di_settings = self.model.get_data_integration_settings(
                            from_notebook=True,
                            global_vars=global_vars,
                        )
                        data_integration_uuid = di_settings.get('data_integration_uuid')
                    except Exception as err:
                        if is_debug():
                            print(f'[ERROR] Block.metadata_async: {err}')

                if data_integration_uuid:
                    option = get_templates(group_templates=True).get(data_integration_uuid)

                    if option:
                        if not data_integration_type:
                            if BlockType.DATA_LOADER == self.model.type:
                                data_integration_type = DATA_INTEGRATION_TYPE_SOURCES
                            else:
                                data_integration_type = DATA_INTEGRATION_TYPE_DESTINATIONS

                        info = build_integration_module_info(data_integration_type, option)
                        if info and info.get('docs'):
                            data['documentation'] = info.get('docs')

            if 'dbt' == display_format:
                query_string = None
                lineage = None
                if self.model.language == BlockLanguage.SQL:
                    lineage = [
                        block.to_dict()
                        for block in self.model.upstream_dbt_blocks(read_only=True)
                    ]
                    query_string = self.model.content_compiled
                data['metadata'] = dict(dbt=dict(
                    lineage=lineage,
                    sql=query_string,
                ))

            return data
        elif 'with_settings' == display_format:
            data = dict(
                pipelines=await self.resource.get_pipelines_from_cache(),
            )

            return data
        elif constants.LIST == display_format and isinstance(self.model, dict):
            return self.model

        return self.model.to_dict()


BlockPresenter.register_formats([
    constants.CREATE,
    constants.UPDATE,
], [
    'content',
])

BlockPresenter.register_format(
    constants.DETAIL,
    [
        'content',
        'outputs',
    ],
)

BlockPresenter.register_format(
    'with_settings',
    [
        'pipelines',
    ],
)
