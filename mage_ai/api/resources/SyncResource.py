import os
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.shared.secrets import create_secret
from mage_ai.data_preparation.sync import (
    GIT_ACCESS_TOKEN_SECRET_NAME,
    GIT_SSH_PRIVATE_KEY_SECRET_NAME,
    GIT_SSH_PUBLIC_KEY_SECRET_NAME,
    AuthType,
    GitConfig,
    UserGitConfig,
)
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.orchestration.db.models.secrets import Secret
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.security import filter_out_values


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
        sync_config = self.get_project_sync_config(user)
        return self.build_result_set(
            [sync_config],
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        repo_name = kwargs.get('repo_name')

        user_settings = payload.pop('user_git_settings', dict())

        updated_payload = self.update_user_settings(payload, repo_name=repo_name)
        preferences = get_preferences(repo_path=repo_name)
        updated_config = dict(preferences.sync_config, **updated_payload)
        # default repo_path to os.getcwd()
        if not updated_config.get('repo_path', None):
            updated_config['repo_path'] = os.getcwd()

        # Update user git settings if they are included
        if user:
            # Validate payloads
            user_payload = self.update_user_settings(user_settings, user=user, repo_name=repo_name)
            UserGitConfig.load(config=user_payload)

            repo_path = kwargs.get('repo_path') or get_repo_path()
            user_preferences = user.preferences or {}
            user_git_settings = user.git_settings or {}
            user_preferences[repo_path] = {
                **user_preferences.get(repo_path, {}),
                'git_settings': {
                    **user_git_settings,
                    **user_payload,
                }
            }
            user.refresh()
            user.update(preferences=user_preferences)

        sync_config = GitConfig.load(config=updated_config)

        preferences.update_preferences(dict(sync_config=updated_config))

        try:
            GitSync(sync_config, setup_repo=True)
        except Exception as err:
            error = ApiError.RESOURCE_ERROR.copy()
            message = str(err)
            if payload.get('access_token'):
                message = filter_out_values(message, [payload.get('access_token')])
            error.update(dict(message=message))
            raise ApiError(error)

        return self(get_preferences(repo_path=repo_name).sync_config, user, **kwargs)

    @classmethod
    def member(self, _pk, user, **kwargs):
        sync_config = self.get_project_sync_config(user, repo_path=(kwargs or {}).get('repo_path'))
        return self(sync_config, user, **kwargs)

    def update(self, payload, **kwargs):
        self.model.pop('user_git_settings')
        config = GitConfig.load(config=self.model)
        sync = GitSync(config)
        git_manager = sync.git_manager
        action_type = payload.get('action_type')
        try:
            if action_type == 'sync_data':
                sync.sync_data()
            elif action_type == 'reset':
                sync.reset()
        except Exception as err:
            error = ApiError.RESOURCE_ERROR.copy()
            message = str(err)
            if git_manager.auth_type == AuthType.HTTPS:
                token = git_manager.get_access_token()
                if token:
                    message = filter_out_values(message, [token])
            error.update(dict(message=message))
            raise ApiError(error)

        return self

    @classmethod
    def get_project_sync_config(
        self,
        user,
        repo_path: str = None,
    ):
        sync_config = get_preferences(repo_path=repo_path).sync_config
        # Make it backwards compatible with storing all of the git settings in the user
        # preferences field.
        if user and user.get_git_settings(repo_path=repo_path):
            sync_config['user_git_settings'] = user.get_git_settings(repo_path=repo_path)
        else:
            sync_config['user_git_settings'] = UserGitConfig.from_dict(sync_config).to_dict()
        return sync_config

    @classmethod
    def update_user_settings(self, payload, user=None, repo_name: str = None) -> Dict:
        user_payload = payload.copy()
        ssh_public_key = user_payload.pop('ssh_public_key', None)
        ssh_private_key = user_payload.pop('ssh_private_key', None)

        if ssh_public_key:
            secret_name = get_ssh_public_key_secret_name(user=user)
            secret = Secret.query.filter(
                Secret.name == secret_name).one_or_none()
            if secret:
                secret.delete()
            create_secret(secret_name, ssh_public_key, repo_name=repo_name)
            user_payload['ssh_public_key_secret_name'] = secret_name
        if ssh_private_key:
            secret_name = get_ssh_private_key_secret_name(user=user)
            secret = Secret.query.filter(
                Secret.name == secret_name).one_or_none()
            if secret:
                secret.delete()
            create_secret(secret_name, ssh_private_key, repo_name=repo_name)
            user_payload['ssh_private_key_secret_name'] = secret_name

        access_token = user_payload.pop('access_token', None)
        if access_token:
            secret_name = get_access_token_secret_name(user=user)
            secret = Secret.query.filter(
                Secret.name == secret_name).one_or_none()
            if secret:
                secret.delete()
            create_secret(secret_name, access_token, repo_name=repo_name)
            user_payload['access_token_secret_name'] = secret_name
        return user_payload
