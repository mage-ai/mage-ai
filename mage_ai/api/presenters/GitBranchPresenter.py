from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.shared.hash import merge_dict


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

    def present(self, **kwargs):
        if 'with_logs' == kwargs['format']:
            return merge_dict(self.model, dict(logs=self.resource.logs(commits=12)))
        elif 'with_remotes' == kwargs['format']:
            return merge_dict(self.model, dict(remotes=self.resource.remotes(limit=100)))

        return self.model


GitBranchPresenter.register_format(
    'with_logs',
    GitBranchPresenter.default_attributes + [
        'logs',
    ],
)


GitBranchPresenter.register_format(
    'with_remotes',
    GitBranchPresenter.default_attributes + [
        'remotes',
    ],
)
