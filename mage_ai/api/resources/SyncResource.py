from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.preferences import (
    get_preferences,
    Preferences,
)
from mage_ai.data_preparation.shared.secrets import create_secret
from mage_ai.data_preparation.sync import (
    GitConfig,
    UserGitConfig,
    GIT_ACCESS_TOKEN_SECRET_NAME,
    GIT_SSH_PRIVATE_KEY_SECRET_NAME,
    GIT_SSH_PUBLIC_KEY_SECRET_NAME,
)
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.orchestration.db.models.secrets import Secret
from typing import Dict
import os


def get_ssh_public_key_secret_name(user: User = None) -> str:
    return f'{GIT_SSH_PUBLIC_KEY_SECRET_NAME}_{user.id}' if user \
        else GIT_SSH_PUBLIC_KEY_SECRET_NAME


def get_ssh_private_key_secret_name(user: User = None) -> str:
    return f'{GIT_SSH_PRIVATE_KEY_SECRET_NAME}_{user.id}' if user \
        else GIT_SSH_PRIVATE_KEY_SECRET_NAME


def get_access_token_secret_name(user: User = None) -> str:
    return f'{GIT_ACCESS_TOKEN_SECRET_NAME}_{user.id}' if user \
        else GIT_ACCESS_TOKEN_SECRET_NAME


class SyncResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        preferences = get_preferences(user=user)
        sync_config = preferences.sync_config
        return self.build_result_set(
            [sync_config],
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        user_settings = payload.pop('user_git_settings', dict())

        payload = self.update_user_settings(payload)
        preferences = get_preferences()
        updated_config = dict(preferences.sync_config, **payload)
        # default repo_path to os.getcwd()
        if not updated_config.get('repo_path', None):
            updated_config['repo_path'] = os.getcwd()
        repo_path = updated_config['repo_path']

        if user:
            user_payload = self.update_user_settings(user_settings, user=user)
            user_git_config = UserGitConfig.load(user_payload)
            user_preferences = user.preferences or dict()
            user_git_settings = user_preferences.get(repo_path, {}).get('git_settings', {})
            user_preferences[repo_path] = {
                **user_preferences.get(repo_path, {}),
                'git_settings': {
                    **user_git_settings,
                    **user_git_config.to_dict()
                }
            }
            user.update(preferences=user_preferences)

        # Validate payload
        sync_config = GitConfig.load(config=updated_config)

        preferences.update_preferences(dict(sync_config=updated_config))

        GitSync(sync_config)

        return self(get_preferences().sync_config, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        sync_config = get_preferences().sync_config
        repo_path = sync_config['repo_path']
        sync_config['user_git_settings'] = user.git_settings(repo_path)

        return self(sync_config, user, **kwargs)

    def update(self, payload, **kwargs):
        self.model.pop('user_git_settings')
        config = GitConfig.load(config=self.model)
        sync = GitSync(config)
        action_type = payload.get('action_type')
        if action_type == 'sync_data':
            sync.sync_data()

        return self

    @classmethod
    def update_user_settings(self, payload, user=None) -> Dict:
        user_payload = payload.copy()
        ssh_public_key = user_payload.pop('ssh_public_key', None)
        ssh_private_key = user_payload.pop('ssh_private_key', None)

        if ssh_public_key:
            secret_name = get_ssh_public_key_secret_name(user=user)
            secret = Secret.query.filter(
                Secret.name == secret_name).one_or_none()
            if secret:
                secret.delete()
            create_secret(secret_name, ssh_public_key)
            user_payload['ssh_public_key_secret_name'] = secret_name
        if ssh_private_key:
            secret_name = get_ssh_private_key_secret_name(user=user)
            secret = Secret.query.filter(
                Secret.name == secret_name).one_or_none()
            if secret:
                secret.delete()
            create_secret(secret_name, ssh_private_key)
            user_payload['ssh_private_key_secret_name'] = secret_name

        access_token = user_payload.pop('access_token', None)
        if access_token:
            secret_name = get_access_token_secret_name(user=user)
            secret = Secret.query.filter(
                Secret.name == secret_name).one_or_none()
            if secret:
                secret.delete()
            create_secret(secret_name, access_token)
            user_payload['access_token_secret_name'] = secret_name
        return user_payload
