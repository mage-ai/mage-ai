from dataclasses import dataclass, field
from enum import Enum
from mage_ai.services.email.config import EmailConfig
from mage_ai.services.slack.config import SlackConfig
from mage_ai.services.teams.config import TeamsConfig
from mage_ai.shared.config import BaseConfig
from typing import Dict, List
import traceback

class AlertOn(str, Enum):
    PIPELINE_RUN_FAILURE = 'trigger_failure'
    PIPELINE_RUN_SUCCESS = 'trigger_success'
    PIPELINE_RUN_PASSED_SLA = 'trigger_passed_sla'


DEFAULT_ALERT_ON = [
    AlertOn.PIPELINE_RUN_FAILURE,
    AlertOn.PIPELINE_RUN_PASSED_SLA,
]


@dataclass
class NotificationConfig(BaseConfig):
    alert_on: List[AlertOn] = field(default_factory=lambda: DEFAULT_ALERT_ON)
    email_config: EmailConfig = None
    slack_config: SlackConfig = None
    teams_config: TeamsConfig = None

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
        if notification_config.teams_config is not None and \
                type(notification_config.teams_config) is dict:
            try:
                notification_config.teams_config = TeamsConfig.load(
                    config=notification_config.teams_config,
                )
            except Exception:
                traceback.print_exc()
                notification_config.teams_config = None
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
