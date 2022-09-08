from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.services.slack.slack import send_slack_message


class NotificationSender:
    def __init__(self, config: NotificationConfig):
        self.config = config

    def send(self, message: str) -> None:
        if self.config.slack_config is not None:
            send_slack_message(self.config.slack_config, message)
