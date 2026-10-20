from mage_ai.api.presenters.BasePresenter import BasePresenter


class AutocompleteItemPresenter(BasePresenter):
    default_attributes = [
        'classes',
        'constants',
        'files',
        'functions',
        'group',
        'id',
        'imports',
        'methods_for_class',
    ]
