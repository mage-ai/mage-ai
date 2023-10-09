from datetime import datetime

from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
    Trigger,
    add_or_update_trigger_for_pipeline_and_persist,
    get_trigger_configs_by_name,
)
from mage_ai.orchestration.db.models.schedules import PipelineSchedule
from mage_ai.settings.repo import get_repo_path
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline, create_user


class PipelineScheduleOperationTests(BaseApiTestCase):
    model_class = PipelineSchedule

    @property
    def model_class_name(self) -> str:
        return 'pipeline_schedule'

    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline('test pipeline', self.repo_path)

    async def test_execute_create_schedule(self):
        email = self.faker.email()
        user = create_user(email=email, roles=1)
        operation = self.build_create_operation(
            dict(
                name='test_schedule',
                schedule_interval='@daily',
                schedule_type=ScheduleType.TIME,
                start_time='2023-01-01T00:00:00',
                status='inactive',
                variables=[],
            ),
            resource_parent='pipeline',
            resource_parent_id=self.pipeline.uuid,
            user=user,
        )
        response = await operation.execute()

        self.assertEqual(response['pipeline_schedule']['name'], 'test_schedule')
        self.assertEqual(response['pipeline_schedule']['repo_path'], get_repo_path())

    async def test_execute_update_schedule_saved_in_code(self):
        email = self.faker.email()
        user = create_user(email=email, roles=1)
        pipeline_schedule = PipelineSchedule.create(
            name='test_schedule_2',
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.DAILY,
            schedule_type=ScheduleType.TIME,
            start_time=datetime(2023, 8, 30, 12, 30, 45),
            status=ScheduleStatus.INACTIVE,
        )
        trigger = Trigger(
            name=pipeline_schedule.name,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            schedule_interval=pipeline_schedule.schedule_interval,
            schedule_type=pipeline_schedule.schedule_type,
            start_time=pipeline_schedule.start_time,
        )
        trigger_configs_by_name = add_or_update_trigger_for_pipeline_and_persist(
            trigger,
            pipeline_schedule.pipeline_uuid,
        )

        self.assertEqual(
            trigger_configs_by_name['test_schedule_2'].get('schedule_interval'),
            ScheduleInterval.DAILY,
        )
        self.assertEqual(
            trigger_configs_by_name['test_schedule_2'].get('status'),
            ScheduleStatus.INACTIVE,
        )

        update_payload = dict(
            schedule_interval='@hourly',
            status='active',
        )
        operation = self.build_update_operation(
            pipeline_schedule.id,
            {
                'pipeline_schedule': update_payload,
            },
            user=user,
        )
        response = await operation.execute()

        self.assertEqual(response['pipeline_schedule']['status'], ScheduleStatus.ACTIVE)
        self.assertEqual(
            response['pipeline_schedule']['schedule_interval'],
            ScheduleInterval.HOURLY,
        )

        # Check if trigger in triggers.yaml config file was also updated
        updated_trigger_configs_by_name = get_trigger_configs_by_name('test_pipeline')
        self.assertEqual(
            updated_trigger_configs_by_name['test_schedule_2']['schedule_interval'],
            ScheduleInterval.HOURLY,
        )
        self.assertEqual(
            updated_trigger_configs_by_name['test_schedule_2']['status'],
            ScheduleStatus.ACTIVE,
        )

    async def test_execute_list(self):
        email = self.faker.email()
        user = create_user(email=email, roles=1)

        await self.base_test_execute_list(
            [
                dict(
                    name='test_schedule',
                    schedule_interval='@daily',
                    schedule_type=ScheduleType.TIME,
                    start_time='2023-01-01T00:00:00',
                    status='inactive',
                    variables=[],
                    repo_path=None,
                ),
                dict(
                    name='test_schedule_2',
                    schedule_interval='@daily',
                    schedule_type=ScheduleType.TIME,
                    start_time='2023-01-01T00:00:00',
                    status='inactive',
                    variables=[],
                ),
            ],
            [
                'id',
            ],
            resource_parent='pipeline',
            resource_parent_id=self.pipeline.uuid,
            user=user,
        )
