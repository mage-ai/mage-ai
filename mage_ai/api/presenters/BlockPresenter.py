from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.constants import BlockLanguage


class BlockPresenter(BasePresenter):
    default_attributes = [
        'all_upstream_blocks_executed',
        'callback_blocks',
        'color',
        'conditional_blocks',
        'configuration',
        'downstream_blocks',
        'executor_config',
        'executor_type',
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
            return self.model.to_dict(include_content=True)
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

            data = self.model.to_dict(
                destination_table=destination_table,
                include_content=True,
                include_outputs=include_outputs,
                state_stream=state_stream,
            )

            if isinstance(self.model, DBTBlock):
                query_string = None
                lineage = None
                if self.model.language == BlockLanguage.SQL:
                    lineage = [block.to_dict() for block in self.model.upstream_dbt_blocks]
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
