from mage_ai.api.presenters.BasePresenter import BasePresenter


class GitBranchPresenter(BasePresenter):
    default_attributes = [
        'name',
        'status',
        'message',
        'action_type',
        'files',
        'modified_files',
        'untracked_files',
    ]
