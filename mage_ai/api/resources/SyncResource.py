from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.git import (
    GIT_SSH_PRIVATE_KEY_SECRET_NAME,
    GIT_SSH_PUBLIC_KEY_SECRET_NAME,
)
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.shared.secrets import create_secret
from mage_ai.data_preparation.sync import GitConfig
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.secrets import Secret


class SyncResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        preferences = get_preferences()
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
            secret = Secret.query.filter(
                Secret.name == GIT_SSH_PUBLIC_KEY_SECRET_NAME).one_or_none()
            if secret:
                secret.delete()
            create_secret(GIT_SSH_PUBLIC_KEY_SECRET_NAME, ssh_public_key)
        if ssh_private_key:
            secret = Secret.query.filter(
                Secret.name == GIT_SSH_PRIVATE_KEY_SECRET_NAME).one_or_none()
            if secret:
                secret.delete()
            create_secret(GIT_SSH_PRIVATE_KEY_SECRET_NAME, ssh_private_key)

        sync_config = GitConfig.load(config=payload)
        get_preferences().update_preferences(
            dict(sync_config=sync_config.to_dict())
        )

        GitSync(sync_config)

        return self(get_preferences().sync_config, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        return self(get_preferences().sync_config, user, **kwargs)

    def update(self, payload, **kwargs):
        config = GitConfig.load(config=self.model)
        sync = GitSync(config)
        action_type = payload.get('action_type')
        if action_type == 'sync_data':
            sync.sync_data()

        return self
