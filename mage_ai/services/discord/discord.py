import json

import requests

from mage_ai.services.discord.config import DiscordConfig


def send_discord_message(config: DiscordConfig, message: str) -> None:
    message = message.replace("\\n", "\n")
    payload = {
                {
                    "content": message
                }
        }

    requests.post(
        config.webhook_url,
        json.dumps(payload),
    )
