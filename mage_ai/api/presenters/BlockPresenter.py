from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class BlockPresenter(BasePresenter):
    default_attributes = [
        'all_upstream_blocks_executed',
        'color',
        'configuration',
        'downstream_blocks',
        'executor_config',
        'executor_type',
        'language',
        'name',
        'status',
        'type',
        'upstream_blocks',
        'uuid',
    ]

    def present(self, **kwargs):
        if kwargs['format'] in [constants.CREATE, constants.UPDATE]:
            return self.model.to_dict(include_content=True)
        elif constants.DETAIL == kwargs['format']:
            include_outputs = kwargs.get('query', {}).get('include_outputs', [True])
            if include_outputs:
                include_outputs = include_outputs[0]
            return self.model.to_dict(include_content=True, include_outputs=include_outputs)

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
