from mage_ai.api.presenters.BasePresenter import BasePresenter


class GlobalDataProductPresenter(BasePresenter):
    default_attributes = [
        'object_type',
        'object_uuid',
        'outdated_after',
        'outdated_starting_at',
        'settings',
        'uuid',
    ]

    def present(self, **kwargs):
        return self.model.to_dict(include_uuid=True)
