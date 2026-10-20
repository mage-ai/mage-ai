import requests

from mage_ai.services.discord.config import DiscordConfig


def send_discord_message(config: DiscordConfig, message: str, title: str) -> None:
    summary = """
    **{title}**
    {message}
    """.format(title=title, message=message)

    requests.post(
        url=config.webhook_url,
        json={
            "content": summary
        }
    )
