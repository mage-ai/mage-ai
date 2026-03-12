import requests

from mage_ai.services.ntfy.config import NtfyConfig


def send_ntfy_message(config: NtfyConfig, message: str, title: str) -> None:
    requests.post(
        config.webhook_url,
        data=message,
        headers={
            "Title": title,
            "Priority": config.priority,
            "Tags": config.tags,
        },
    )
