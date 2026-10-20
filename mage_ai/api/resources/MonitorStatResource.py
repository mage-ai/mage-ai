from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.monitor.monitor_stats import MonitorStats


class MonitorStatResource(GenericResource):
    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        query = kwargs.get('query', {})

        pipeline_uuids = query.get('pipeline_uuid', None)
        if pipeline_uuids:
            pipeline_uuid = pipeline_uuids[0]
        else:
            pipeline_uuid = None

        start_times = query.get('start_time', None)
        if start_times:
            start_time = start_times[0]
        else:
            start_time = None

        end_times = query.get('end_time', None)
        if end_times:
            end_time = end_times[0]
        else:
            end_time = None

        group_by_pipeline_type = query.get('group_by_pipeline_type', False)
        if group_by_pipeline_type:
            group_by_pipeline_type = group_by_pipeline_type[0]
        else:
            group_by_pipeline_type = False

        pipeline_schedule_ids = query.get('pipeline_schedule_id', None)
        if pipeline_schedule_ids:
            pipeline_schedule_id = pipeline_schedule_ids[0]
        else:
            pipeline_schedule_id = None

        stats = MonitorStats().get_stats(
            pk,
            pipeline_uuid=pipeline_uuid,
            start_time=start_time,
            end_time=end_time,
            pipeline_schedule_id=pipeline_schedule_id,
            group_by_pipeline_type=group_by_pipeline_type,
        )

        return self(dict(
            stats_type=pk,
            stats=stats,
        ), user, **kwargs)
