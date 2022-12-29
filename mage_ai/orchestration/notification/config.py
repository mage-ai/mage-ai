from dataclasses import dataclass
from mage_ai.services.email.config import EmailConfig
from mage_ai.services.slack.config import SlackConfig
from mage_ai.shared.config import BaseConfig
from typing import Dict
import traceback


@dataclass
class NotificationConfig(BaseConfig):
    email_config: EmailConfig = None
    slack_config: SlackConfig = None

    @classmethod
    def load(self, config_path: str = None, config: Dict = None):
        notification_config = super().load(config_path=config_path, config=config)
        if notification_config.slack_config is not None and \
                type(notification_config.slack_config) is dict:
            try:
                notification_config.slack_config = SlackConfig.load(
                    config=notification_config.slack_config,
                )
            except Exception:
                traceback.print_exc()
                notification_config.slack_config = None
        if notification_config.email_config is not None and \
                type(notification_config.email_config) is dict:
            try:
                notification_config.email_config = EmailConfig.load(
                    config=notification_config.email_config,
                )
            except Exception:
                traceback.print_exc()
                notification_config.email_config = None
        return notification_config
