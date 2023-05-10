from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.preferences import (
    get_preferences,
    Preferences,
)
from mage_ai.data_preparation.shared.secrets import create_secret
from mage_ai.data_preparation.sync import (
    GitConfig,
    GIT_ACCESS_TOKEN_SECRET_NAME,
    GIT_SSH_PRIVATE_KEY_SECRET_NAME,
    GIT_SSH_PUBLIC_KEY_SECRET_NAME,
)
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.orchestration.db.models.secrets import Secret
from mage_ai.server.scheduler_manager import (
    SCHEDULER_AUTO_RESTART_INTERVAL,
    check_scheduler_status,
    scheduler_manager,
)
import os


class SchedulerResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        scheduler = dict(status=scheduler_manager.get_status())
        return self.build_result_set(
            [scheduler],
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        action_type = payload.get('action_type')

        if action_type == 'start':
            scheduler_manager.start_scheduler()
        elif action_type == 'stop':
            scheduler_manager.stop_scheduler()

        return self(dict(status=scheduler_manager.get_status()), user, **kwargs)
