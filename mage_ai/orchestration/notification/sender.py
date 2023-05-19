import os

from mage_ai.orchestration.notification.config import AlertOn, NotificationConfig
from mage_ai.services.email.email import send_email
from mage_ai.services.google_chat.google_chat import send_google_chat_message
from mage_ai.services.opsgenie.opsgenie import send_opsgenie_alert
from mage_ai.services.slack.slack import send_slack_message
from mage_ai.services.teams.teams import send_teams_message
from mage_ai.settings import MAGE_PUBLIC_HOST


class NotificationSender:
    def __init__(self, config: NotificationConfig):
        self.config = config

    def send(
        self,
        title: str = None,
        summary: str = None,
        details: str = None,
    ) -> None:
        """Send messages to the notification channels.

        Args:
            title (str, optional): Short sentence, used as title (e.g. Email subject)
            summary (str, optional): Mid-length sentences, used as the summary of the message.
            details (str, optional): Long message, used as the body of the message (e.g. Email body)
        """
        if summary is None:
            return
        if self.config.slack_config is not None and self.config.slack_config.is_valid:
            send_slack_message(self.config.slack_config, details or summary)

        if self.config.teams_config is not None and self.config.teams_config.is_valid:
            send_teams_message(self.config.teams_config, summary)

        if self.config.google_chat_config is not None and self.config.google_chat_config.is_valid:
            send_google_chat_message(self.config.google_chat_config, summary)

        if self.config.email_config is not None and title is not None:
            send_email(
                self.config.email_config,
                subject=title,
                message=details or summary,
            )

        if self.config.opsgenie_config is not None and self.config.opsgenie_config.is_valid:
            send_opsgenie_alert(
                self.config.opsgenie_config,
                message=title,
                description=details or summary,
            )

    def send_pipeline_run_success_message(self, pipeline, pipeline_run) -> None:
        if AlertOn.PIPELINE_RUN_SUCCESS in self.config.alert_on:
            message = (
                f'Successfully ran Pipeline `{pipeline.uuid}` '
                f'with Trigger {pipeline_run.pipeline_schedule.id} '
                f'`{pipeline_run.pipeline_schedule.name}` '
                f'at execution time `{pipeline_run.execution_date}`.'
            )
            email_content = f'{message}\n'
            if os.getenv('ENV') != 'production':
                email_content += f'Open {self.__pipeline_run_url(pipeline, pipeline_run)} '\
                                  'to check pipeline run results and logs.'
            self.send(
                title=f'Successfully ran Pipeline {pipeline.uuid}',
                summary=message,
                details=email_content,
            )

    def send_pipeline_run_failure_message(
        self,
        pipeline,
        pipeline_run,
        message: str = None,
    ) -> None:
        if AlertOn.PIPELINE_RUN_FAILURE in self.config.alert_on:
            message = message or (
                f'Failed to run Pipeline `{pipeline.uuid}` '
                f'with Trigger {pipeline_run.pipeline_schedule.id} '
                f'`{pipeline_run.pipeline_schedule.name}` '
                f'at execution time `{pipeline_run.execution_date}`.'
            )
            email_content = f'{message}\n'
            if os.getenv('ENV') != 'production' or MAGE_PUBLIC_HOST != 'http://localhost:6789':
                """
                Include the URL for the following cases
                1. Dev environment: Use the default localhost as host in URL
                2. Production environment: If MAGE_PUBLIC_HOST is set, use it as host.
                """
                email_content += f'Open {self.__pipeline_run_url(pipeline, pipeline_run)} '\
                                 'to check pipeline run results and logs.'
            self.send(
                title=f'Failed to run Mage pipeline {pipeline.uuid}',
                summary=message,
                details=email_content,
            )

    def send_pipeline_run_sla_passed_message(self, pipeline, pipeline_run) -> None:
        if AlertOn.PIPELINE_RUN_PASSED_SLA in self.config.alert_on:
            message = (
                f'SLA passed for pipeline `{pipeline.uuid}` '
                f'with Trigger {pipeline_run.pipeline_schedule.id} '
                f'`{pipeline_run.pipeline_schedule.name}` '
                f'at execution time `{pipeline_run.execution_date}`.'
            )
            email_content = f'{message}\n'
            if os.getenv('ENV') != 'production':
                email_content += f'Open {self.__pipeline_run_url(pipeline, pipeline_run)} '\
                                  'to check pipeline run results and logs.'
            self.send(
                title=f'SLA passed for Mage pipeline {pipeline.uuid}',
                summary=message,
                details=email_content,
            )

    @staticmethod
    def __pipeline_run_url(pipeline, pipeline_run):
        return f'{MAGE_PUBLIC_HOST}/pipelines/{pipeline.uuid}/triggers/'\
               f'{pipeline_run.pipeline_schedule_id}'
