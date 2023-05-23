from mage_ai.api.presenters.BasePresenter import BasePresenter


class SyncPresenter(BasePresenter):
    default_attributes = [
        'branch',
        'remote_repo_link',
        'username',
        'email',
        'ssh_private_key',
        'ssh_public_key',
        'repo_path',
        'sync_on_pipeline_run',
        'type',
        'access_token',
        'auth_type',
        'user_git_settings',
    ]
