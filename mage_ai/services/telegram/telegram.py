import requests

from mage_ai.services.telegram.config import TelegramConfig


def send_telegram_message(config: TelegramConfig, message: str, title: str) -> None:
    summary = f"<b>{title}</b>\n\n{message}"

    payload = {
        "text": summary,
        "parse_mode": "HTML"
    }

    requests.post(
        url=config.webhook_url,
        json=payload
    )
