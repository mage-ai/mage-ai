from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.sync.git_sync import GitSync


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
    def create(self, payload, user, **kwargs):
        get_preferences().update_preferences(
            dict(sync_config=payload)
        )

        return self(get_preferences().sync_config, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        preferences = get_preferences()
        sync_config = preferences.sync_config

        return self(sync_config, user, **kwargs)

    def update(self, payload, **kwargs):
        sync_config = self.model
        action_type = payload.get('action_type')
        if action_type == 'sync_data':
            if sync_config.get('type') == 'git':
                sync = GitSync(sync_config)
                sync.sync_data()

        return self
