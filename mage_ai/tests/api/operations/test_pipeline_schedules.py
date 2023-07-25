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

    async def test_execute_list(self):
        email = self.faker.email()
        user = create_user(email=email, roles=1)

        await self.base_test_execute_list(
            [
                dict(
                    name='test_schedule',
                    schedule_interval='@daily',
                    start_time='2023-01-01T00:00:00',
                    status='inactive',
                    variables=[],
                    repo_path=None,
                ),
                dict(
                    name='test_schedule_2',
                    schedule_interval='@daily',
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
