from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.monitor.monitor_stats import MonitorStats
from mage_ai.tests.base_test import DBTestCase


class MonitorStatsTest(DBTestCase):
    def setUp(self):
        super().setUp()
        PipelineRun.query.delete()
        PipelineSchedule.query.delete()
        db_connection.session.commit()

    def test_pipeline_run_count_filters_schedules_to_current_repo(self):
        current_schedule = PipelineSchedule.create(
            name='current repo schedule',
            pipeline_uuid='current_pipeline',
            repo_path=self.repo_path,
        )
        legacy_schedule = PipelineSchedule.create(
            name='legacy schedule',
            pipeline_uuid='legacy_pipeline',
            repo_path=None,
        )
        other_schedule = PipelineSchedule.create(
            name='other repo schedule',
            pipeline_uuid='other_pipeline',
            repo_path=f'{self.repo_path}_other',
        )

        created_at = datetime(2024, 1, 1)
        for schedule in [current_schedule, legacy_schedule, other_schedule]:
            PipelineRun.create(
                create_block_runs=False,
                pipeline_schedule_id=schedule.id,
                pipeline_uuid=schedule.pipeline_uuid,
                status=PipelineRun.PipelineRunStatus.COMPLETED,
                created_at=created_at,
            )

        def build_pipeline(pipeline_uuid, **kwargs):
            return SimpleNamespace(uuid=pipeline_uuid, type='python')

        with patch(
            'mage_ai.orchestration.monitor.monitor_stats.Pipeline.get',
            side_effect=build_pipeline,
        ) as mock_get_pipeline:
            stats = MonitorStats().get_pipeline_run_count(
                group_by_pipeline_type=True,
            )

        self.assertEqual({current_schedule.id, legacy_schedule.id}, set(stats.keys()))
        self.assertNotIn(other_schedule.id, stats)
        self.assertEqual(
            {'current_pipeline', 'legacy_pipeline'},
            {call.args[0] for call in mock_get_pipeline.call_args_list},
        )
        for call in mock_get_pipeline.call_args_list:
            self.assertEqual(self.repo_path, call.kwargs['repo_path'])
