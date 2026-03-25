from datetime import datetime, timezone

from mage_ai.api.errors import ApiError
from mage_ai.api.utils import get_query_timestamps
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)

RESULT_KEYS = [
    'backfill_id',
    'block_runs',
    'block_runs_count',
    'completed_at',
    'completed_block_runs_count',
    'created_at',
    'event_variables',
    'execution_date',
    'executor_type',
    'id',
    'metrics',
    'passed_sla',
    'pipeline_schedule_id',
    'pipeline_schedule_name',
    'pipeline_schedule_token',
    'pipeline_schedule_type',
    'pipeline_uuid',
    'started_at',
    'status',
    'updated_at',
    'variables',
]

T_EARLY = datetime(2024, 1, 15, 8, 0, 0, tzinfo=timezone.utc)
T_MID = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
T_LATE = datetime(2024, 1, 15, 16, 0, 0, tzinfo=timezone.utc)


class PipelineRunDatetimeFilterEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
        )
        self.run_early = PipelineRun.create(
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.pipeline_schedule.pipeline_uuid,
            started_at=T_EARLY,
        )
        self.run_mid = PipelineRun.create(
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.pipeline_schedule.pipeline_uuid,
            started_at=T_MID,
        )
        self.run_late = PipelineRun.create(
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.pipeline_schedule.pipeline_uuid,
            started_at=T_LATE,
        )

        self.t_early = T_EARLY
        self.t_mid = T_MID
        self.t_late = T_LATE


build_list_endpoint_tests(
    PipelineRunDatetimeFilterEndpointTest,
    test_uuid='start_timestamp',
    resource='pipeline_run',
    list_count=2,
    build_query=lambda self: {
        'start_timestamp': [str(int(self.t_mid.timestamp()))],
    },
    result_keys_to_compare=RESULT_KEYS,
)

build_list_endpoint_tests(
    PipelineRunDatetimeFilterEndpointTest,
    test_uuid='end_timestamp',
    resource='pipeline_run',
    list_count=2,
    build_query=lambda self: {
        'end_timestamp': [str(int(self.t_mid.timestamp()))],
    },
    result_keys_to_compare=RESULT_KEYS,
)

build_list_endpoint_tests(
    PipelineRunDatetimeFilterEndpointTest,
    test_uuid='start_and_end_timestamp',
    resource='pipeline_run',
    list_count=1,
    build_query=lambda self: {
        'start_timestamp': [str(int(self.t_mid.timestamp()))],
        'end_timestamp': [str(int(self.t_mid.timestamp()))],
    },
    result_keys_to_compare=RESULT_KEYS,
)

build_list_endpoint_tests(
    PipelineRunDatetimeFilterEndpointTest,
    test_uuid='no_timestamp_filter',
    resource='pipeline_run',
    list_count=3,
    result_keys_to_compare=RESULT_KEYS,
)


class GetQueryTimestampsTest(BaseAPIEndpointTest):
    def test_utc_conversion(self):
        query_arg = {'start_timestamp': ['0']}
        start, end = get_query_timestamps(query_arg)
        self.assertEqual(start, datetime(1970, 1, 1, 0, 0, 0))
        self.assertIsNone(end)

    def test_inverted_timestamps_raises(self):
        query_arg = {
            'start_timestamp': [str(int(T_LATE.timestamp()))],
            'end_timestamp': [str(int(T_EARLY.timestamp()))],
        }
        with self.assertRaises(ApiError) as ctx:
            get_query_timestamps(query_arg)
        self.assertIn('start_timestamp', ctx.exception.message)

    def test_invalid_start_timestamp_raises(self):
        with self.assertRaises(ApiError):
            get_query_timestamps({'start_timestamp': ['not_a_number']})

    def test_invalid_end_timestamp_raises(self):
        with self.assertRaises(ApiError):
            get_query_timestamps({'end_timestamp': ['not_a_number']})
