from mage_ai.api.presenters.BasePresenter import BasePresenter


class PullRequestPresenter(BasePresenter):
    default_attributes = [
        'body',
        'created_at',
        'id',
        'is_merged',
        'last_modified',
        'merged',
        'state',
        'title',
        'url',
        'user',
    ]
