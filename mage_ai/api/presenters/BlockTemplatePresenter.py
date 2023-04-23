from mage_ai.api.presenters.BasePresenter import BasePresenter


class BlockTemplatePresenter(BasePresenter):
    default_attributes = [
        'block_type',
        'description',
        'groups',
        'language',
        'name',
        'path',
    ]
