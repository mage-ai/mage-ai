from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.block.dbt.utils import (
    add_blocks_upstream_from_refs,
    compiled_query_string,
)


class BlockPresenter(BasePresenter):
    default_attributes = [
        'all_upstream_blocks_executed',
        'callback_blocks',
        'color',
        'configuration',
        'downstream_blocks',
        'executor_config',
        'executor_type',
        'has_callback',
        'language',
        'metadata',
        'name',
        'status',
        'type',
        'upstream_blocks',
        'uuid',
    ]

    def present(self, **kwargs):
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

            if 'dbt' == display_format:
                upstream_blocks = add_blocks_upstream_from_refs(
                    self.model,
                    add_current_block=True,
                    read_only=True,
                )
                query_string = compiled_query_string(self.model)
                data['metadata'] = dict(dbt=dict(
                    lineage=[b.to_dict() for b in upstream_blocks],
                    sql=query_string,
                ))

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
