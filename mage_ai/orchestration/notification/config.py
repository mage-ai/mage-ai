from dataclasses import dataclass
from mage_ai.services.slack.config import SlackConfig
from mage_ai.shared.config import BaseConfig
from typing import Dict


@dataclass
class NotificationConfig(BaseConfig):
    slack_config: SlackConfig = None

    @classmethod
    def load(self, config_path: str = None, config: Dict = None):
        notification_config = super().load(config_path=config_path, config=config)
        if notification_config.slack_config is not None and \
                type(notification_config.slack_config) is dict:
            notification_config.slack_config = SlackConfig.load(
                config=notification_config.slack_config,
            )
        return notification_config
