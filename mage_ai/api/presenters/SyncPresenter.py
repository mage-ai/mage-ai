from mage_ai.api.presenters.BasePresenter import BasePresenter


class SyncPresenter(BasePresenter):
    default_attributes = [
        'access_token',
        'auth_type',
        'branch',
        'email',
        'remote_repo_link',
        'repo_path',
        'ssh_private_key',
        'ssh_public_key',
        'sync_on_pipeline_run',
        'sync_on_start',
        'sync_submodules',
        'type',
        'user_git_settings',
        'username',
    ]
