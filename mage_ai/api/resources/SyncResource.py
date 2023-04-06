from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.preferences import (
    get_preferences,
    Preferences,
)
from mage_ai.data_preparation.shared.secrets import create_secret
from mage_ai.data_preparation.sync import (
    GitConfig,
    GIT_SSH_PRIVATE_KEY_SECRET_NAME,
    GIT_SSH_PUBLIC_KEY_SECRET_NAME,
)
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.orchestration.db.models.secrets import Secret


def get_ssh_public_key_secret_name(user: User = None) -> str:
    return f'{GIT_SSH_PUBLIC_KEY_SECRET_NAME}_{user.id}' if user \
        else GIT_SSH_PUBLIC_KEY_SECRET_NAME


def get_ssh_private_key_secret_name(user: User = None) -> str:
    return f'{GIT_SSH_PRIVATE_KEY_SECRET_NAME}_{user.id}' if user \
        else GIT_SSH_PRIVATE_KEY_SECRET_NAME


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
        ssh_public_key = payload.get('ssh_public_key')
        ssh_private_key = payload.get('ssh_private_key')

        payload.pop('ssh_public_key', None)
        payload.pop('ssh_private_key', None)

        if ssh_public_key:
            secret_name = get_ssh_public_key_secret_name(user=user)
            secret = Secret.query.filter(
                Secret.name == secret_name).one_or_none()
            if secret:
                secret.delete()
            create_secret(secret_name, ssh_public_key)
            payload['ssh_public_key_secret_name'] = secret_name
        if ssh_private_key:
            secret_name = get_ssh_private_key_secret_name(user=user)
            secret = Secret.query.filter(
                Secret.name == secret_name).one_or_none()
            if secret:
                secret.delete()
            create_secret(secret_name, ssh_private_key)
            payload['ssh_private_key_secret_name'] = secret_name

        preferences = Preferences(user=user) if user else get_preferences()
        updated_config = dict(preferences.sync_config, **payload)
        # Validate payload
        sync_config = GitConfig.load(config=updated_config)

        preferences.update_preferences(dict(sync_config=updated_config))

        GitSync(sync_config)

        return self(get_preferences(user=user).sync_config, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        return self(get_preferences(user=user).sync_config, user, **kwargs)

    def update(self, payload, **kwargs):
        config = GitConfig.load(config=self.model)
        sync = GitSync(config)
        action_type = payload.get('action_type')
        if action_type == 'sync_data':
            sync.sync_data()

        return self
