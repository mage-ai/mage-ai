from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.shared.secrets import get_secret_value
from mage_ai.settings.repo import get_repo_path


class SyncPresenter(BasePresenter):
    default_attributes = [
        'access_token',
        'access_token_secret_name',
        'auth_type',
        'branch',
        'email',
        'remote_repo_link',
        'repo_path',
        'ssh_private_key',
        'ssh_private_key_secret_name',
        'ssh_public_key',
        'ssh_public_key_secret_name',
        'sync_on_pipeline_run',
        'sync_on_start',
        'sync_submodules',
        'type',
        'user_git_settings',
        'username',
    ]

    def present(self, **kwargs):
        data = self.model

        def filter_invalid_secret_values(data):
            for attribute in self.default_attributes:
                if attribute.endswith('_secret_name'):
                    secret_name = data.get(attribute)
                    if secret_name and not get_secret_value(
                        secret_name,
                        repo_name=get_repo_path(user=self.current_user),
                        suppress_warning=False,
                    ):
                        data[attribute] = None

        filter_invalid_secret_values(self.model)
        if 'user_git_settings' in data:
            filter_invalid_secret_values(data['user_git_settings'])

        return self.model
