import requests

from mage_ai.services.ntfy.config import NtfyConfig


def send_ntfy_message(config: NtfyConfig, message: str, title: str) -> None:
    config.tags = config.tags or []
    requests.post(
        config.webhook_url,
        data=message,
        headers={
            "Title": title,
            "Priority": config.priority,
            "Tags": ','.join(config.tags)
        },
    )
