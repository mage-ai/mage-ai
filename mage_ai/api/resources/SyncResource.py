from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.sync import SyncType, SyncConfig
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
        sync_config = SyncConfig.load(config=payload)
        get_preferences().update_preferences(
            dict(sync_config=sync_config.to_dict())
        )

        if sync_config.type == SyncType.GIT:
            # set up Git repo
            GitSync(sync_config)

        return self(get_preferences().sync_config, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        return self(get_preferences().sync_config, user, **kwargs)

    def update(self, payload, **kwargs):
        sync_config = SyncConfig.load(config=self.model)
        action_type = payload.get('action_type')
        if action_type == 'sync_data':
            if sync_config.type == SyncType.GIT:
                sync = GitSync(sync_config)
                sync.sync_data()

        return self
