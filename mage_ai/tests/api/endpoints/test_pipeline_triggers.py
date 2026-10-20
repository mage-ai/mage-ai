from datetime import datetime

from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
    Trigger,
    add_or_update_trigger_for_pipeline_and_persist,
    get_triggers_by_pipeline,
)
from mage_ai.orchestration.db.models.schedules import PipelineSchedule
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_list_endpoint_tests,
)
from mage_ai.tests.factory import create_pipeline_with_blocks


class PipelineTriggerAPIEndpointTest(BaseAPIEndpointTest):
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

        trigger = Trigger(
            name=self.pipeline_schedule.name,
            pipeline_uuid=self.pipeline_schedule.pipeline_uuid,
            schedule_interval=self.pipeline_schedule.schedule_interval,
            schedule_type=self.pipeline_schedule.schedule_type,
            settings=self.pipeline_schedule.settings,
            sla=self.pipeline_schedule.sla,
            start_time=self.pipeline_schedule.start_time,
            status=self.pipeline_schedule.status,
            variables=self.pipeline_schedule.variables,
        )
        trigger2 = Trigger(
            name=self.pipeline_schedule2.name,
            pipeline_uuid=self.pipeline_schedule2.pipeline_uuid,
            schedule_interval=self.pipeline_schedule2.schedule_interval,
            schedule_type=self.pipeline_schedule2.schedule_type,
            settings=self.pipeline_schedule2.settings,
            sla=self.pipeline_schedule2.sla,
            start_time=self.pipeline_schedule2.start_time,
            status=self.pipeline_schedule2.status,
            variables=self.pipeline_schedule2.variables,
        )

        add_or_update_trigger_for_pipeline_and_persist(trigger, self.pipeline.uuid)
        add_or_update_trigger_for_pipeline_and_persist(trigger2, self.pipeline2.uuid)


# No parent
build_list_endpoint_tests(
    PipelineTriggerAPIEndpointTest,
    list_count=1,
    resource='pipeline_trigger',
    resource_parent='pipeline',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    result_keys_to_compare=[
        'envs',
        'name',
        'pipeline_uuid',
        'schedule_interval',
        'schedule_type',
        'settings',
        'sla',
        'start_time',
        'status',
        'variables',
    ],
)


build_create_endpoint_tests(
    PipelineTriggerAPIEndpointTest,
    resource='pipeline_trigger',
    resource_parent='pipeline',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    build_payload=lambda self: dict(
        name=self.faker.unique.name(),
        pipeline_schedule_id=self.pipeline_schedule2.id,
    ),
    assert_before_create_count=lambda self: len(
        get_triggers_by_pipeline(self.pipeline.uuid),
    ) == 1,
    assert_after_create_count=lambda self: len(
        get_triggers_by_pipeline(self.pipeline.uuid),
    ) == 2,
)
