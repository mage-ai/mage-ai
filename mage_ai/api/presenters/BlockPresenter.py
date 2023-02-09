from mage_ai.api.presenters.BasePresenter import BasePresenter


class BlockPresenter(BasePresenter):
    default_attributes = [
        'all_upstream_blocks_executed',
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
        return self.model.to_dict()
