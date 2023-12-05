from datetime import datetime, timedelta
from typing import Dict

from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
)
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    EventMatcher,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)
from mage_ai.tests.factory import create_pipeline_with_blocks


class PipelineScheduleAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.pipeline2 = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
        )

        self.pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
            schedule_interval=ScheduleInterval.MONTHLY,
            schedule_type=ScheduleType.TIME,
            start_time=datetime.utcnow(),
            status=ScheduleStatus.INACTIVE,
        )
        self.pipeline_schedule2 = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
            schedule_type=ScheduleType.EVENT,
        )
        self.pipeline_schedule3 = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline2.uuid,
            schedule_type=ScheduleType.API,
        )

        self.pipeline_run = PipelineRun.create(
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.pipeline_schedule.pipeline_uuid,
        )
        self.pipeline_run2 = PipelineRun.create(
            pipeline_schedule_id=self.pipeline_schedule2.id,
            pipeline_uuid=self.pipeline_schedule.pipeline_uuid,
        )

        self.pipeline_run3 = PipelineRun.create(
            pipeline_schedule_id=self.pipeline_schedule3.id,
            pipeline_uuid=self.pipeline_schedule3.pipeline_uuid,
        )

        self.block_run = BlockRun.create(
            block_uuid=list(self.pipeline.blocks_by_uuid.keys())[0],
            pipeline_run_id=self.pipeline_run.id,
            status=BlockRun.BlockRunStatus.CANCELLED,
        )
        self.block_run2 = BlockRun.create(
            block_uuid=list(self.pipeline.blocks_by_uuid.keys())[1],
            pipeline_run_id=self.pipeline_run2.id,
            status=BlockRun.BlockRunStatus.CANCELLED,
        )
        self.block_run3 = BlockRun.create(
            block_uuid=list(self.pipeline2.blocks_by_uuid.keys())[0],
            pipeline_run_id=self.pipeline_run3.id,
            status=BlockRun.BlockRunStatus.CANCELLED,
        )

        self.pipeline_runs_count = len(PipelineRun.query.all())
        self.pipeline_runs_count_by_pipeline_schedule_id = {
            self.pipeline_schedule.id: 1,
            self.pipeline_schedule2.id: 1,
            self.pipeline_schedule3.id: 1,
        }


# No parent
build_list_endpoint_tests(
    PipelineScheduleAPIEndpointTest,
    list_count=3,
    resource='pipeline_schedules',
    result_keys_to_compare=[
        'created_at',
        'description',
        'event_matchers',
        'global_data_product_uuid',
        'id',
        'last_pipeline_run_status',
        'name',
        'next_pipeline_run_date',
        'pipeline_runs_count',
        'pipeline_uuid',
        'repo_path',
        'schedule_interval',
        'schedule_type',
        'settings',
        'sla',
        'start_time',
        'status',
        'tags',
        'token',
        'updated_at',
        'variables',
    ],
)


# Query
build_list_endpoint_tests(
    PipelineScheduleAPIEndpointTest,
    list_count=2,
    resource='pipeline_schedules',
    build_query=lambda _self: {
        'schedule_type[]': [
            ','.join([e.value for e in [
                ScheduleType.EVENT,
                ScheduleType.TIME,
            ]])
        ],
    },
    result_keys_to_compare=[
        'created_at',
        'description',
        'event_matchers',
        'global_data_product_uuid',
        'id',
        'last_pipeline_run_status',
        'name',
        'next_pipeline_run_date',
        'pipeline_runs_count',
        'pipeline_uuid',
        'repo_path',
        'schedule_interval',
        'schedule_type',
        'settings',
        'sla',
        'start_time',
        'status',
        'tags',
        'token',
        'updated_at',
        'variables',
    ],
)

# Parent
build_list_endpoint_tests(
    PipelineScheduleAPIEndpointTest,
    list_count=1,
    resource='pipeline_schedules',
    resource_parent='pipeline',
    get_resource_parent_id=lambda self: self.pipeline2.uuid,
    result_keys_to_compare=[
        'created_at',
        'description',
        'event_matchers',
        'global_data_product_uuid',
        'id',
        'last_pipeline_run_status',
        'name',
        'next_pipeline_run_date',
        'pipeline_runs_count',
        'pipeline_uuid',
        'repo_path',
        'schedule_interval',
        'schedule_type',
        'settings',
        'sla',
        'start_time',
        'status',
        'tags',
        'token',
        'updated_at',
        'variables',
    ],
)


build_create_endpoint_tests(
    PipelineScheduleAPIEndpointTest,
    resource='pipeline_schedules',
    resource_parent='pipeline',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    assert_before_create_count=lambda self: len(
        PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline.uuid,
        ).all(),
    ) == 2,
    assert_after_create_count=lambda self: len(
        PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline.uuid,
        ).all(),
    ) == 3,
    build_payload=lambda self: dict(
        description=self.faker.text(),
        name=self.faker.unique.name(),
        schedule_interval=ScheduleInterval.HOURLY,
        schedule_type=ScheduleType.TIME,
        start_time=datetime.utcnow(),
        status=ScheduleStatus.ACTIVE,
        variables=dict(fire=1),
    ),
)

build_detail_endpoint_tests(
    PipelineScheduleAPIEndpointTest,
    resource='pipeline_schedule',
    get_resource_id=lambda self: self.pipeline_schedule.id,
    result_keys_to_compare=[
        'created_at',
        'description',
        'event_matchers',
        'global_data_product_uuid',
        'id',
        'name',
        'next_pipeline_run_date',
        'pipeline_uuid',
        'repo_path',
        'schedule_interval',
        'schedule_type',
        'settings',
        'sla',
        'start_time',
        'status',
        'tags',
        'token',
        'updated_at',
        'variables',
    ],
)


def _build_payload_update(self) -> Dict:
    return dict(
        description='new description',
        event_matchers=[
            dict(
                event_type=EventMatcher.EventType.AWS_EVENT,
                name=self.faker.unique.name(),
                pattern=dict(
                    water=1,
                ),
            ),
            dict(
                event_type=EventMatcher.EventType.AWS_EVENT,
                name=self.faker.unique.name(),
                pattern=dict(
                    wind=2,
                ),
            ),
        ],
        name='new name',
        repo_path='new repo_path',
        schedule_interval=ScheduleInterval.DAILY,
        schedule_type=ScheduleType.API,
        settings=dict(
            earth=4,
            lightning=5,
        ),
        sla=40,
        start_time=self.pipeline_schedule.start_time + timedelta(days=7),
        status=ScheduleStatus.ACTIVE,
        variables=dict(
            materia=6,
        ),
    )


def _assert_after_update(self, _result, model_before_update) -> bool:
    payload = _build_payload_update(self)
    model_after_update = PipelineSchedule.query.get(self.pipeline_schedule.id)

    validations_on_model_before_update = []
    validations_on_model_after_update = []
    for key, value in payload.items():
        value_before_update = getattr(model_before_update, key)
        value_after_update = getattr(model_after_update, key)

        if key not in ['event_matchers', 'start_time']:
            validations_on_model_before_update.append(value_before_update != value)
            validations_on_model_after_update.append(value_after_update == value)
        else:
            validations_on_model_before_update.append(value_before_update != value_after_update)
            validations_on_model_after_update.append(value_before_update != value_after_update)

    return all(validations_on_model_before_update) and all(validations_on_model_after_update)


build_update_endpoint_tests(
    PipelineScheduleAPIEndpointTest,
    resource='pipeline_schedule',
    get_resource_id=lambda self: self.pipeline_schedule.id,
    build_payload=_build_payload_update,
    get_model_before_update=lambda self: PipelineSchedule.query.get(self.pipeline_schedule.id),
    assert_after_update=_assert_after_update,
)


build_delete_endpoint_tests(
    PipelineScheduleAPIEndpointTest,
    resource='pipeline_schedule',
    get_resource_id=lambda self: self.pipeline_schedule.id,
    assert_before_delete_count=lambda self: len(
        PipelineSchedule.query.filter(
            PipelineSchedule.id == self.pipeline_schedule.id,
        ).all(),
    ) == 1,
    assert_after_delete_count=lambda self: len(
        PipelineSchedule.query.filter(
            PipelineSchedule.id == self.pipeline_schedule.id,
        ).all(),
    ) == 0,
)
