from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.services.email.email import send_email
from mage_ai.services.slack.slack import send_slack_message


class NotificationSender:
    def __init__(self, config: NotificationConfig):
        self.config = config

    def send(self, message: str = None, subject: str = None) -> None:
        if message is None:
            return
        if self.config.slack_config is not None and self.config.slack_config.is_valid:
            send_slack_message(self.config.slack_config, message)
        if self.config.email_config is not None and subject is not None:
            send_email(self.config.email_config, subject=subject, message=message)
