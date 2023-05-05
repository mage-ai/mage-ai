from mage_ai.api.presenters.BasePresenter import BasePresenter
import os


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
    ]

    def present(self, **kwargs):
        sync_config = self.model
        if not sync_config.get('repo_path', None):
            sync_config['repo_path'] = os.getcwd()
        return sync_config
