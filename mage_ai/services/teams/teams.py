import requests

from mage_ai.services.teams.config import TeamsConfig


def send_teams_message(
    config: TeamsConfig,
    message: str,
    title: str = 'Mage pipeline run status logs',
) -> None:
    for url in config.webhook_url:
        requests.post(
            url=url,
            json={
                'summary': title,
                'sections': [{
                    'activityTitle': title,
                    'activitySubtitle': message,
                }],
            },
        )
