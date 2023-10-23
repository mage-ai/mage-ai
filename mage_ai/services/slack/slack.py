import json

import requests

from mage_ai.services.slack.config import SlackConfig


def send_slack_message(config: SlackConfig, message: str, title: str = None) -> None:
    message = message.replace("\\n", "\n")
    payload = {
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": title if title else "Mage Notification",
                },
            },
            {"type": "divider"},
            {"type": "section", "text": {"type": "mrkdwn", "text": message}},
        ]
    }

    requests.post(
        config.webhook_url,
        json.dumps(payload),
    )
