from unittest.mock import ANY, patch

from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.orchestration.notification.sender import NotificationSender
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline, create_pipeline_run_with_schedule
from mage_ai.tests.orchestration.notification.constants import (
    EMAIL_NOTIFICATION_CONFIG,
    OPSGENIE_NOTIFICATION_CONFIG,
    SLACK_NOTIFICATION_CONFIG,
    SLACK_NOTIFICATION_CONFIG_WITH_CUSTOM_TEMPLATE,
    TEAMS_NOTIFICATION_CONFIG,
    TEAMS_NOTIFICATION_CONFIG_NO_ALERT_ON,
)


class NotificationSenderTests(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline('test pipeline', self.repo_path)
        self.pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline')

    @patch('mage_ai.orchestration.notification.sender.send_slack_message')
    @patch('mage_ai.orchestration.notification.sender.send_email')
    def test_send_pipeline_run_success_message(self, mock_send_email, mock_send_slack):
        notification_config = NotificationConfig.load(config=EMAIL_NOTIFICATION_CONFIG)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run
        sender.send_pipeline_run_success_message(self.__class__.pipeline, pipeline_run)
        self.assertEqual(mock_send_slack.call_count, 0)
        email_subject = 'Successfully ran Pipeline test_pipeline'
        email_content = (
            'Successfully ran Pipeline `test_pipeline` '
            f'with Trigger {pipeline_run.pipeline_schedule.id} '
            f'`{pipeline_run.pipeline_schedule.name}` '
            f'at execution time `{pipeline_run.execution_date}`.'
        )
        email_content += (
            '\nOpen http://localhost:6789/pipelines/test_pipeline/runs/'
            f'{pipeline_run.id} to check pipeline run results and logs.'
        )
        mock_send_email.assert_called_once_with(
            notification_config.email_config,
            subject=email_subject,
            message=email_content,
        )

    @patch('mage_ai.orchestration.notification.sender.send_slack_message')
    @patch('mage_ai.orchestration.notification.sender.send_email')
    def test_send_pipeline_run_failure_message(self, mock_send_email, mock_send_slack):
        notification_config = NotificationConfig.load(config=SLACK_NOTIFICATION_CONFIG)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run
        sender.send_pipeline_run_failure_message(self.__class__.pipeline, pipeline_run)
        self.assertEqual(mock_send_email.call_count, 0)
        message = (
            'Failed to run Pipeline `test_pipeline` '
            f'with Trigger {pipeline_run.pipeline_schedule.id} '
            f'`{pipeline_run.pipeline_schedule.name}` '
            f'at execution time `{pipeline_run.execution_date}`. Error: None\n'
            f'Open http://localhost:6789/pipelines/test_pipeline/runs/'
            f'{pipeline_run.id} to check pipeline run results and logs.'
        )
        title = 'Failed to run Mage pipeline test_pipeline'
        mock_send_slack.assert_called_once_with(
            notification_config.slack_config,
            message,
            title
        )

    @patch('mage_ai.orchestration.notification.sender.send_slack_message')
    @patch('mage_ai.orchestration.notification.sender.send_email')
    def test_send_pipeline_run_failure_message_with_custom_template(
        self,
        mock_send_email,
        mock_send_slack,
    ):
        notification_config = NotificationConfig.load(
            config=SLACK_NOTIFICATION_CONFIG_WITH_CUSTOM_TEMPLATE)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run
        sender.send_pipeline_run_failure_message(self.__class__.pipeline, pipeline_run)
        self.assertEqual(mock_send_email.call_count, 0)
        message = (
            'Failed to execute pipeline http://localhost:6789/pipelines/test_pipeline/runs/'
            f'{pipeline_run.id}. Pipeline uuid: test_pipeline. '
            f'Trigger name: {pipeline_run.pipeline_schedule.name}.'
        )
        title = 'Failed to run Mage pipeline test_pipeline'
        mock_send_slack.assert_called_once_with(
            notification_config.slack_config,
            message,
            title
        )

    @patch('mage_ai.orchestration.notification.sender.send_teams_message')
    @patch('mage_ai.orchestration.notification.sender.send_email')
    def test_send_pipeline_run_failure_message_using_teams(
        self,
        mock_send_email,
        mock_send_teams_message,
    ):
        notification_config = NotificationConfig.load(config=TEAMS_NOTIFICATION_CONFIG)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run
        sender.send_pipeline_run_failure_message(self.__class__.pipeline, pipeline_run)
        self.assertEqual(mock_send_email.call_count, 0)
        message = (
            'Failed to run Pipeline `test_pipeline` '
            f'with Trigger {pipeline_run.pipeline_schedule.id} '
            f'`{pipeline_run.pipeline_schedule.name}` '
            f'at execution time `{pipeline_run.execution_date}`. Error: None'
        )
        title = 'Failed to run Mage pipeline test_pipeline'
        mock_send_teams_message.assert_called_once_with(
            notification_config.teams_config,
            message,
            title
        )

    @patch('mage_ai.orchestration.notification.sender.send_teams_message')
    @patch('mage_ai.orchestration.notification.sender.send_email')
    def test_alert_on_configuration(self, mock_send_email, mock_send_teams_message):
        notification_config = NotificationConfig.load(config=TEAMS_NOTIFICATION_CONFIG)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run
        sender.send_pipeline_run_success_message(self.__class__.pipeline, pipeline_run)
        self.assertEqual(mock_send_email.call_count, 0)
        message = (
            'Successfully ran Pipeline `test_pipeline` '
            f'with Trigger {pipeline_run.pipeline_schedule.id} '
            f'`{pipeline_run.pipeline_schedule.name}` '
            f'at execution time `{pipeline_run.execution_date}`.'
        )
        title = 'Successfully ran Pipeline test_pipeline'
        mock_send_teams_message.assert_called_once_with(
            notification_config.teams_config,
            message,
            title
        )

    @patch('mage_ai.orchestration.notification.sender.send_teams_message')
    @patch('mage_ai.orchestration.notification.sender.send_email')
    def test_alert_on_configuration_empty(self, mock_send_email, mock_send_teams_message):
        notification_config = NotificationConfig.load(config=TEAMS_NOTIFICATION_CONFIG_NO_ALERT_ON)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run
        sender.send_pipeline_run_failure_message(self.__class__.pipeline, pipeline_run)
        self.assertEqual(mock_send_email.call_count, 0)
        self.assertEqual(mock_send_teams_message.call_count, 0)

    @patch('mage_ai.orchestration.notification.sender.send_opsgenie_alert')
    @patch('mage_ai.orchestration.notification.sender.send_email')
    def test_send_pipeline_run_failure_message_using_opsgenie(
            self,
            mock_send_email,
            mock_send_opsgenie_message,
    ):
        notification_config = NotificationConfig.load(config=OPSGENIE_NOTIFICATION_CONFIG)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run
        sender.send_pipeline_run_failure_message(self.__class__.pipeline, pipeline_run)
        self.assertEqual(mock_send_email.call_count, 0)
        mock_send_opsgenie_message.assert_called_once_with(
            notification_config.opsgenie_config,
            message=ANY,
            description=ANY,
        )


class NotificationSenderStacktraceTests(DBTestCase):
    """Tests for the enhanced failure message: stacktrace in template, None-guarding."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.pipeline = create_pipeline('test_stacktrace_pipeline', cls.repo_path)
        cls.pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_stacktrace_pipeline'
        )

    @patch('mage_ai.orchestration.notification.sender.send_slack_message')
    def test_stacktrace_appears_in_slack_message(self, mock_send_slack):
        """When stacktrace is provided, it is included in the Slack notification body."""
        notification_config = NotificationConfig.load(config=SLACK_NOTIFICATION_CONFIG)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run

        dbt_stacktrace = (
            'Error for block my_block:\n'
            'dbt build failed. The following models/tests encountered errors:\n'
            '  [model] my_model: Database Error\n    syntax error'
        )
        sender.send_pipeline_run_failure_message(
            self.__class__.pipeline,
            pipeline_run,
            error='Failed blocks: my_block',
            stacktrace=dbt_stacktrace,
        )

        call_args = mock_send_slack.call_args
        sent_message = call_args[0][1]  # positional: (config, message, title)
        self.assertIn('[model] my_model', sent_message)
        self.assertIn('syntax error', sent_message)

    @patch('mage_ai.orchestration.notification.sender.send_slack_message')
    def test_none_stacktrace_does_not_produce_literal_none(self, mock_send_slack):
        """When stacktrace=None, the word 'None' must not appear in the message."""
        notification_config = NotificationConfig.load(config=SLACK_NOTIFICATION_CONFIG)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run

        sender.send_pipeline_run_failure_message(
            self.__class__.pipeline,
            pipeline_run,
            error='some error',
            stacktrace=None,
        )

        sent_message = mock_send_slack.call_args[0][1]
        # The literal string 'None' must not appear as a value
        self.assertNotIn('\nNone', sent_message)

    @patch('mage_ai.orchestration.notification.sender.send_slack_message')
    def test_none_stacktrace_adds_no_extra_blank_line(self, mock_send_slack):
        """When stacktrace=None, no extra blank line is added after the error."""
        notification_config = NotificationConfig.load(config=SLACK_NOTIFICATION_CONFIG)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run

        sender.send_pipeline_run_failure_message(
            self.__class__.pipeline,
            pipeline_run,
            error='some error',
            stacktrace=None,
        )

        sent_message = mock_send_slack.call_args[0][1]
        self.assertNotIn('some error\n\n', sent_message)

    @patch('mage_ai.orchestration.notification.sender.send_slack_message')
    def test_stacktrace_and_error_both_appear(self, mock_send_slack):
        """Both the error summary and the dbt stacktrace detail appear in the message."""
        notification_config = NotificationConfig.load(config=SLACK_NOTIFICATION_CONFIG)
        sender = NotificationSender(config=notification_config)
        pipeline_run = self.__class__.pipeline_run

        sender.send_pipeline_run_failure_message(
            self.__class__.pipeline,
            pipeline_run,
            error='Failed blocks: my_dbt_block',
            stacktrace='Error for block my_dbt_block:\ndbt run failed.\n  [model] orders: OOM',
        )

        sent_message = mock_send_slack.call_args[0][1]
        self.assertIn('Failed blocks: my_dbt_block', sent_message)
        self.assertIn('[model] orders', sent_message)
