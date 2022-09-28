from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.services.email.email import send_email
from mage_ai.services.slack.slack import send_slack_message
import os


class NotificationSender:
    def __init__(self, config: NotificationConfig):
        self.config = config

    def send(
        self,
        message: str = None,
        email_subject: str = None,
        email_content: str = None,
    ) -> None:
        if message is None:
            return
        if self.config.slack_config is not None and self.config.slack_config.is_valid:
            send_slack_message(self.config.slack_config, message)
        if self.config.email_config is not None and email_subject is not None:
            send_email(
                self.config.email_config,
                subject=email_subject,
                message=email_content or message,
            )

    def send_pipeline_run_success_message(self, pipeline, pipeline_run) -> None:
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
            message=message,
            email_subject=f'Successfully ran Pipeline {pipeline.uuid}',
            email_content=email_content,
        )

    def send_pipeline_run_failure_message(self, pipeline, pipeline_run) -> None:
        message = (
            f'Failed to run Pipeline `{pipeline.uuid}` '
            f'with Trigger {pipeline_run.pipeline_schedule.id} '
            f'`{pipeline_run.pipeline_schedule.name}` '
            f'at execution time `{pipeline_run.execution_date}`.'
        )
        email_content = f'{message}\n'
        if os.getenv('ENV') != 'production':
            email_content += f'Open {self.__pipeline_run_url(pipeline, pipeline_run)} '\
                                'to check pipeline run results and logs.'
        self.send(
            message=message,
            email_subject=f'Failed to run Mage pipeline {pipeline.uuid}',
            email_content=email_content,
        )

    def __pipeline_run_url(self, pipeline, pipeline_run):
        return f'http://localhost:6789/pipelines/{pipeline.uuid}/triggers/'\
                f'{pipeline_run.pipeline_schedule_id}'
