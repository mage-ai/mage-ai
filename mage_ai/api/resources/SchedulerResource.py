from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.scheduler_manager import scheduler_manager


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
