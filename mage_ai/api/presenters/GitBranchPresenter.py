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

        return self.model


GitBranchPresenter.register_format(
    'with_logs',
    GitBranchPresenter.default_attributes + [
        'logs',
    ],
)
