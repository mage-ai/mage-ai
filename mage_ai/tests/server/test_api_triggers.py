import json

from mage_ai.data_preparation.models.triggers import ScheduleType
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.triggers.utils import create_and_start_pipeline_run
from mage_ai.server.api.triggers import build_api_trigger_payload
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class ApiTriggerPipelineHandlerTest(DBTestCase):
    def setUp(self):
        super().setUp()
        self.pipeline = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
        )
        self.pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
            schedule_type=ScheduleType.API,
            token=self.faker.unique.uuid4(),
        )

    def tearDown(self):
        PipelineRun.query.delete()
        PipelineSchedule.query.delete()
        self.pipeline.delete()
        super().tearDown()

    def test_array_body_creates_pipeline_run_with_event_payload(self):
        request_body = [
            dict(objectId=123, subscriptionType='contact.creation'),
            dict(objectId=456, subscriptionType='contact.propertyChange'),
        ]
        payload = build_api_trigger_payload(json.dumps(request_body).encode())

        pipeline_run = create_and_start_pipeline_run(
            self.pipeline,
            self.pipeline_schedule,
            payload,
            should_schedule=False,
        )

        self.assertEqual({}, pipeline_run.variables.get('event', {}))
        self.assertEqual(request_body, pipeline_run.event_variables)
        self.assertEqual(request_body, pipeline_run.get_variables()['event'])

    def test_object_body_preserves_runtime_and_event_variables(self):
        request_body = dict(
            pipeline_run=dict(
                variables=dict(target_env='staging'),
            ),
            schema='public',
            table='contacts',
        )
        payload = build_api_trigger_payload(json.dumps(request_body).encode())

        pipeline_run = create_and_start_pipeline_run(
            self.pipeline,
            self.pipeline_schedule,
            payload,
            should_schedule=False,
        )

        variables = pipeline_run.get_variables()
        self.assertEqual('staging', variables['target_env'])
        self.assertEqual('public', variables['schema'])
        self.assertEqual('contacts', variables['table'])
        self.assertEqual(
            dict(schema='public', table='contacts'),
            pipeline_run.event_variables,
        )
        self.assertEqual(
            dict(schema='public', table='contacts'),
            variables['event'],
        )
