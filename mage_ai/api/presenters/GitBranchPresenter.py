from mage_ai.api.presenters.BasePresenter import BasePresenter


class GitBranchPresenter(BasePresenter):
    default_attributes = [
        'action_type',
        'files',
        'message',
        'modified_files',
        'name',
        'staged_files',
        'status',
        'untracked_files',
    ]
