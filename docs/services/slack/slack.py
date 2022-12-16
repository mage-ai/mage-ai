from mage_ai.services.slack.config import SlackConfig
import json
import requests


def send_slack_message(config: SlackConfig, message: str) -> None:
    requests.post(
        config.webhook_url,
        json.dumps(dict(text=message)),
    )
