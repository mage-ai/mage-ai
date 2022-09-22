from .base import BaseHandler
from mage_ai.orchestration.monitor.monitor_stats import MonitorStats


class ApiMonitorStatsHandler(BaseHandler):
    def get(self, stats_type):
        pipeline_uuid = self.get_argument('pipeline_uuid', None)
        start_time = self.get_argument('start_time', None)
        end_time = self.get_argument('end_time', None)
        pipeline_schedule_id = self.get_argument('pipeline_schedule_id', None)
        stats = MonitorStats().get_stats(
            stats_type,
            pipeline_uuid=pipeline_uuid,
            start_time=start_time,
            end_time=end_time,
            pipeline_schedule_id=pipeline_schedule_id,
        )
        self.write(dict(
            monitor_stats=dict(
                stats_type=stats_type,
                stats=stats,
            ),
        ))
