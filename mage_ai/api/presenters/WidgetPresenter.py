from mage_ai.api.presenters.BasePresenter import BasePresenter


class WidgetPresenter(BasePresenter):
    default_attributes = [
        'all_upstream_blocks_executed',
        'color',
        'configuration',
        'content',
        'downstream_blocks',
        'executor_config',
        'executor_type',
        'has_callback',
        'language',
        'name',
        'outputs',
        'status',
        'timeout',
        'type',
        'upstream_blocks',
        'uuid',
    ]

    def present(self, **kwargs):
        if type(self.model) is dict:
            return self.model

        return self.model.to_dict(include_content=True)
