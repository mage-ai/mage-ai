from mage_ai.services.teams.config import TeamsConfig
import json
import requests


def send_teams_message(config: TeamsConfig, message: str, title: str = 'Mage pipeline run status logs') -> None:
    requests.post(
        url=config.webhook_url,
        json={
            'summary': title,
            'sections': [{
                'activityTitle': title,
                'activitySubtitle': message,
            }],
        },
    )
