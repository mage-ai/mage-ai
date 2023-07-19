from mage_ai.api.presenters.GitBranchPresenter import GitBranchPresenter


class GitCustomBranchPresenter(GitBranchPresenter):
    default_attributes = [
        'action_type',
        'error',
        'files',
        'message',
        'modified_files',
        'name',
        'progress',
        'staged_files',
        'status',
        'sync_config',
        'untracked_files',
    ]

    def present(self, **kwargs):
        display_format = kwargs.get('format')

        data_to_display = self.model

        if 'with_basic_details' == display_format:
            return dict(name=data_to_display.get('name'))
        elif 'with_files' == display_format:
            data_to_display.update(files=self.resource.files(limit=100))
        elif 'with_logs' == display_format:
            data_to_display.update(logs=self.resource.logs(commits=12))
        elif 'with_remotes' == display_format:
            data_to_display.update(remotes=self.resource.remotes(limit=100))

        return data_to_display


GitCustomBranchPresenter.register_format(
    'with_basic_details',
    [
        'name',
    ],
)


GitCustomBranchPresenter.register_format(
    'with_files',
    GitCustomBranchPresenter.default_attributes + [
        'files',
    ],
)


GitCustomBranchPresenter.register_format(
    'with_logs',
    GitCustomBranchPresenter.default_attributes + [
        'logs',
    ],
)


GitCustomBranchPresenter.register_format(
    'with_remotes',
    GitCustomBranchPresenter.default_attributes + [
        'remotes',
    ],
)
