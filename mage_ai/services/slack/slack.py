import json

import requests

from mage_ai.services.slack.config import SlackConfig


def send_slack_message(config: SlackConfig, message: str) -> None:
    payload = {
        "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": message}}]
    }

    requests.post(
        config.webhook_url,
        json.dumps(payload),
    )
