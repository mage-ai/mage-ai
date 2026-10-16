import json
import secrets
from unittest.mock import MagicMock, patch

from mage_ai.data_preparation.models.triggers import ScheduleType
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.server.api.triggers import ApiTriggerPipelineHandler
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class TestApiTriggerPipelineHandler(DBTestCase):
    def setUp(self):
        super().setUp()
        self.pipeline = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
        )
        self.token = secrets.token_urlsafe(32)
        self.pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
            schedule_type=ScheduleType.API,
            token=self.token,
            settings={},
        )

    def tearDown(self):
        PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == self.pipeline_schedule.id
        ).delete()
        self.pipeline_schedule.delete()
        if self.pipeline:
            self.pipeline.delete()
        super().tearDown()

    def _create_mock_handler(self, body=None):
        handler = MagicMock(spec=ApiTriggerPipelineHandler)
        handler.get_payload = MagicMock(return_value={'variables': {}})

        mock_request = MagicMock()
        mock_request.body = json.dumps(body) if body else None
        mock_request.headers = {'Authorization': f'Bearer {self.token}'}
        handler.request = mock_request

        handler.write = MagicMock()
        return handler

    def test_api_trigger_creates_pipeline_run_when_skip_disabled(self):
        self.pipeline_schedule.update(settings={'skip_if_previous_running': False})

        with patch(
            'mage_ai.server.api.triggers.create_and_start_pipeline_run'
        ) as mock_create_and_start:
            mock_pipeline_run = MagicMock()
            mock_pipeline_run.to_dict.return_value = {'id': 1, 'status': 'initial'}
            mock_create_and_start.return_value = mock_pipeline_run

            handler = self._create_mock_handler()

            with patch.object(
                PipelineSchedule, 'query'
            ) as mock_query:
                mock_query.get.return_value = self.pipeline_schedule

                ApiTriggerPipelineHandler.post(
                    handler,
                    self.pipeline_schedule.id,
                    self.token,
                )

            mock_create_and_start.assert_called_once()
            handler.write.assert_called_once()

    def test_api_trigger_skips_run_when_previous_running_and_skip_enabled(self):
        self.pipeline_schedule.update(settings={'skip_if_previous_running': True})

        running_pipeline_run = PipelineRun.create(
            pipeline_uuid=self.pipeline.uuid,
            pipeline_schedule_id=self.pipeline_schedule.id,
            status=PipelineRun.PipelineRunStatus.RUNNING,
        )

        try:
            with patch(
                'mage_ai.server.api.triggers.create_and_cancel_pipeline_run'
            ) as mock_cancel, patch(
                'mage_ai.server.api.triggers.create_and_start_pipeline_run'
            ) as mock_start:
                mock_cancelled_run = MagicMock()
                mock_cancelled_run.to_dict.return_value = {
                    'id': 2,
                    'status': 'cancelled',
                }
                mock_cancel.return_value = mock_cancelled_run

                handler = self._create_mock_handler()

                with patch.object(PipelineSchedule, 'query') as mock_schedule_query:
                    mock_schedule_query.get.return_value = self.pipeline_schedule

                    ApiTriggerPipelineHandler.post(
                        handler,
                        self.pipeline_schedule.id,
                        self.token,
                    )

                mock_cancel.assert_called_once()
                mock_start.assert_not_called()
                handler.write.assert_called_once()

                call_args = handler.write.call_args[0][0]
                self.assertEqual(call_args['pipeline_run']['status'], 'cancelled')
        finally:
            running_pipeline_run.delete()

    def test_api_trigger_skips_run_when_previous_initial_and_skip_enabled(self):
        self.pipeline_schedule.update(settings={'skip_if_previous_running': True})

        initial_pipeline_run = PipelineRun.create(
            pipeline_uuid=self.pipeline.uuid,
            pipeline_schedule_id=self.pipeline_schedule.id,
            status=PipelineRun.PipelineRunStatus.INITIAL,
        )

        try:
            with patch(
                'mage_ai.server.api.triggers.create_and_cancel_pipeline_run'
            ) as mock_cancel, patch(
                'mage_ai.server.api.triggers.create_and_start_pipeline_run'
            ) as mock_start:
                mock_cancelled_run = MagicMock()
                mock_cancelled_run.to_dict.return_value = {
                    'id': 2,
                    'status': 'cancelled',
                }
                mock_cancel.return_value = mock_cancelled_run

                handler = self._create_mock_handler()

                with patch.object(PipelineSchedule, 'query') as mock_schedule_query:
                    mock_schedule_query.get.return_value = self.pipeline_schedule

                    ApiTriggerPipelineHandler.post(
                        handler,
                        self.pipeline_schedule.id,
                        self.token,
                    )

                mock_cancel.assert_called_once()
                mock_start.assert_not_called()
        finally:
            initial_pipeline_run.delete()

    def test_api_trigger_starts_run_when_no_previous_running_and_skip_enabled(self):
        self.pipeline_schedule.update(settings={'skip_if_previous_running': True})

        completed_pipeline_run = PipelineRun.create(
            pipeline_uuid=self.pipeline.uuid,
            pipeline_schedule_id=self.pipeline_schedule.id,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )

        try:
            with patch(
                'mage_ai.server.api.triggers.create_and_cancel_pipeline_run'
            ) as mock_cancel, patch(
                'mage_ai.server.api.triggers.create_and_start_pipeline_run'
            ) as mock_start:
                mock_pipeline_run = MagicMock()
                mock_pipeline_run.to_dict.return_value = {
                    'id': 2,
                    'status': 'initial',
                }
                mock_start.return_value = mock_pipeline_run

                handler = self._create_mock_handler()

                with patch.object(PipelineSchedule, 'query') as mock_schedule_query:
                    mock_schedule_query.get.return_value = self.pipeline_schedule

                    ApiTriggerPipelineHandler.post(
                        handler,
                        self.pipeline_schedule.id,
                        self.token,
                    )

                mock_cancel.assert_not_called()
                mock_start.assert_called_once()
        finally:
            completed_pipeline_run.delete()

    def test_api_trigger_starts_run_when_no_runs_exist_and_skip_enabled(self):
        self.pipeline_schedule.update(settings={'skip_if_previous_running': True})

        with patch(
            'mage_ai.server.api.triggers.create_and_cancel_pipeline_run'
        ) as mock_cancel, patch(
            'mage_ai.server.api.triggers.create_and_start_pipeline_run'
        ) as mock_start:
            mock_pipeline_run = MagicMock()
            mock_pipeline_run.to_dict.return_value = {'id': 1, 'status': 'initial'}
            mock_start.return_value = mock_pipeline_run

            handler = self._create_mock_handler()

            with patch.object(PipelineSchedule, 'query') as mock_schedule_query:
                mock_schedule_query.get.return_value = self.pipeline_schedule

                ApiTriggerPipelineHandler.post(
                    handler,
                    self.pipeline_schedule.id,
                    self.token,
                )

            mock_cancel.assert_not_called()
            mock_start.assert_called_once()

    def test_api_trigger_skips_with_multiple_running_runs(self):
        self.pipeline_schedule.update(settings={'skip_if_previous_running': True})

        running_runs = []
        for i in range(3):
            run = PipelineRun.create(
                pipeline_uuid=self.pipeline.uuid,
                pipeline_schedule_id=self.pipeline_schedule.id,
                status=PipelineRun.PipelineRunStatus.RUNNING,
            )
            running_runs.append(run)

        try:
            with patch(
                'mage_ai.server.api.triggers.create_and_cancel_pipeline_run'
            ) as mock_cancel, patch(
                'mage_ai.server.api.triggers.create_and_start_pipeline_run'
            ) as mock_start:
                mock_cancelled_run = MagicMock()
                mock_cancelled_run.to_dict.return_value = {
                    'id': 10,
                    'status': 'cancelled',
                }
                mock_cancel.return_value = mock_cancelled_run

                handler = self._create_mock_handler()

                with patch.object(PipelineSchedule, 'query') as mock_schedule_query:
                    mock_schedule_query.get.return_value = self.pipeline_schedule

                    ApiTriggerPipelineHandler.post(
                        handler,
                        self.pipeline_schedule.id,
                        self.token,
                    )

                mock_cancel.assert_called_once()
                mock_start.assert_not_called()
        finally:
            for run in running_runs:
                run.delete()

    def test_cancel_message_content(self):
        self.pipeline_schedule.update(settings={'skip_if_previous_running': True})

        running_pipeline_run = PipelineRun.create(
            pipeline_uuid=self.pipeline.uuid,
            pipeline_schedule_id=self.pipeline_schedule.id,
            status=PipelineRun.PipelineRunStatus.RUNNING,
        )

        try:
            with patch(
                'mage_ai.server.api.triggers.create_and_cancel_pipeline_run'
            ) as mock_cancel:
                mock_cancelled_run = MagicMock()
                mock_cancelled_run.to_dict.return_value = {
                    'id': 2,
                    'status': 'cancelled',
                }
                mock_cancel.return_value = mock_cancelled_run

                handler = self._create_mock_handler()

                with patch.object(PipelineSchedule, 'query') as mock_schedule_query:
                    mock_schedule_query.get.return_value = self.pipeline_schedule

                    ApiTriggerPipelineHandler.post(
                        handler,
                        self.pipeline_schedule.id,
                        self.token,
                    )

                call_args = mock_cancel.call_args
                self.assertIn('message', call_args.kwargs)
                self.assertIn('skipping', call_args.kwargs['message'].lower())
        finally:
            running_pipeline_run.delete()
