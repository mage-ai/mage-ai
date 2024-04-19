import os
import traceback
from typing import Dict

from mage_ai.orchestration.notification.config import (
    AlertOn,
    MessageTemplate,
    NotificationConfig,
)
from mage_ai.services.discord.discord import send_discord_message
from mage_ai.services.email.email import send_email
from mage_ai.services.google_chat.google_chat import send_google_chat_message
from mage_ai.services.opsgenie.opsgenie import send_opsgenie_alert
from mage_ai.services.slack.slack import send_slack_message
from mage_ai.services.teams.teams import send_teams_message
from mage_ai.services.telegram.telegram import send_telegram_message
from mage_ai.settings import DEFAULT_LOCALHOST_URL, MAGE_PUBLIC_HOST

DEFAULT_MESSAGES = dict(
    success=dict(
        title='Successfully ran Pipeline {pipeline_uuid}',
        summary=(
            'Successfully ran Pipeline `{pipeline_uuid}` with Trigger {pipeline_schedule_id} '
            '`{pipeline_schedule_name}` at execution time `{execution_time}`.'
        ),
    ),
    failure=dict(
        title='Failed to run Mage pipeline {pipeline_uuid}',
        summary=(
            'Failed to run Pipeline `{pipeline_uuid}` with Trigger {pipeline_schedule_id} '
            '`{pipeline_schedule_name}` at execution time `{execution_time}`. '
            'Error: {error}'
        ),
    ),
    passed_sla=dict(
        title='SLA missed for Mage pipeline {{pipeline_uuid}}',
        summary=(
            'SLA missed for pipeline `{pipeline_uuid}` with Trigger {pipeline_schedule_id} '
            '`{pipeline_schedule_name}` at execution time `{execution_time}`.'
        ),
    ),
)


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
            try:
                send_slack_message(self.config.slack_config, details or summary, title)
            except Exception:
                traceback.print_exc()

        if self.config.teams_config is not None and self.config.teams_config.is_valid:
            try:
                send_teams_message(self.config.teams_config, summary)
            except Exception:
                traceback.print_exc()

        if self.config.discord_config is not None and self.config.discord_config.is_valid:
            try:
                send_discord_message(self.config.discord_config, summary, title)
            except Exception:
                traceback.print_exc()

        if self.config.telegram_config is not None and self.config.telegram_config.is_valid:
            try:
                send_telegram_message(self.config.telegram_config, summary, title)
            except Exception:
                traceback.print_exc()

        if self.config.google_chat_config is not None and self.config.google_chat_config.is_valid:
            try:
                send_google_chat_message(self.config.google_chat_config, summary)
            except Exception:
                traceback.print_exc()

        if self.config.email_config is not None and title is not None:
            try:
                send_email(
                    self.config.email_config,
                    subject=title,
                    message=details or summary,
                )
            except Exception:
                traceback.print_exc()

        if self.config.opsgenie_config is not None and self.config.opsgenie_config.is_valid:
            try:
                send_opsgenie_alert(
                    self.config.opsgenie_config,
                    message=title,
                    description=details or summary,
                )
            except Exception:
                traceback.print_exc()

    def send_pipeline_run_success_message(self, pipeline, pipeline_run) -> None:
        if AlertOn.PIPELINE_RUN_SUCCESS in self.config.alert_on:
            default_message = DEFAULT_MESSAGES['success']
            if self.config.message_templates:
                message_template = self.config.message_templates.success
            else:
                message_template = None
            self.__send_pipeline_run_message(
                default_message,
                pipeline,
                pipeline_run,
                message_template=message_template,
            )

    def send_pipeline_run_failure_message(
        self,
        pipeline,
        pipeline_run,
        error: str = None,
        stacktrace: str = None,
        summary: str = None,
    ) -> None:
        if AlertOn.PIPELINE_RUN_FAILURE in self.config.alert_on:
            default_message = DEFAULT_MESSAGES['failure']
            if self.config.message_templates:
                message_template = self.config.message_templates.failure
            else:
                message_template = None
            self.__send_pipeline_run_message(
                default_message,
                pipeline,
                pipeline_run,
                error=error,
                message_template=message_template,
                stacktrace=stacktrace,
                summary=summary,
            )

    def send_pipeline_run_sla_passed_message(self, pipeline, pipeline_run) -> None:
        if AlertOn.PIPELINE_RUN_PASSED_SLA in self.config.alert_on:
            default_message = DEFAULT_MESSAGES['passed_sla']
            if self.config.message_templates:
                message_template = self.config.message_templates.passed_sla
            else:
                message_template = None
            self.__send_pipeline_run_message(
                default_message,
                pipeline,
                pipeline_run,
                message_template=message_template,
            )

    def __interpolate_vars(
        self,
        text: str,
        pipeline,
        pipeline_run,
        error: str = None,
        stacktrace: str = None,
    ):
        if text is None or pipeline is None or pipeline_run is None:
            return text
        return text.format(
            error=error,
            execution_time=pipeline_run.execution_date,
            pipeline_run_url=self.__pipeline_run_url(pipeline, pipeline_run),
            pipeline_schedule_id=pipeline_run.pipeline_schedule.id,
            pipeline_schedule_name=pipeline_run.pipeline_schedule.name,
            pipeline_uuid=pipeline.uuid,
            stacktrace=stacktrace,
        )

    def __send_pipeline_run_message(
        self,
        default_message: Dict,
        pipeline,
        pipeline_run,
        error: str = None,
        message_template: MessageTemplate = None,
        stacktrace: str = None,
        summary: str = None,
    ):
        """Shared method to send pipeline run message of multiple types (success, failure, etc.).
        Priority of constructing message payload.
        1. If `summary` is provided in the method kwargs, use the `summary`
        2. If `message_template` is not None, use the user defined `message_template`.
        3. If any of `title`, `summary`, `details` is None after the steps above, get the value from
            `default_message`.

        Args:
            default_message (Dict): default message dict, containing "title",
                "summary", "details" keys.
            pipeline: the pipeline object, used to interpolate variables in the message.
            pipeline_run: the pipeline run object, used to interpolate variables in the message.
            error (str): the error message that can be interpolated in the message.
            message_template (MessageTemplate, optional): custom message template that's provided
                by user.
            summary (str, optional): summary that's used to override the custom message template.
        """
        title = None
        details = None

        if summary is not None:
            details = self.__with_pipeline_run_url(summary, pipeline, pipeline_run)

        default_title = default_message['title']
        default_summary = default_message['summary']
        default_details = self.__with_pipeline_run_url(default_summary, pipeline, pipeline_run)

        if message_template is not None:
            if title is None and message_template.title is not None:
                title = message_template.title
            if summary is None and message_template.summary is not None:
                summary = message_template.summary
            if details is None and message_template.details is not None:
                details = message_template.details

        self.send(
            title=self.__interpolate_vars(
                title or default_title,
                pipeline,
                pipeline_run,
                error=error,
                stacktrace=stacktrace,
            ),
            summary=self.__interpolate_vars(
                summary or default_summary,
                pipeline,
                pipeline_run,
                error=error,
                stacktrace=stacktrace,
            ),
            details=self.__interpolate_vars(
                details or default_details,
                pipeline,
                pipeline_run,
                error=error,
                stacktrace=stacktrace,
            ),
        )

    def __with_pipeline_run_url(self, text, pipeline, pipeline_run):
        if text is None:
            return text
        text = f'{text}\n'
        if os.getenv('ENV') != 'production' or MAGE_PUBLIC_HOST != DEFAULT_LOCALHOST_URL:
            """
            Include the URL for the following cases
            1. Dev environment: Use the default localhost as host in URL
            2. Production environment: If MAGE_PUBLIC_HOST is set, use it as host.
            """
            text += f'Open {self.__pipeline_run_url(pipeline, pipeline_run)} '\
                    'to check pipeline run results and logs.'
        return text

    @staticmethod
    def __pipeline_run_url(pipeline, pipeline_run):
        return f'{MAGE_PUBLIC_HOST}/pipelines/{pipeline.uuid}/runs/'\
               f'{pipeline_run.id}'
