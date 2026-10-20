from mage_ai.services.opsgenie.config import OpsgenieConfig
import requests
import json


def send_opsgenie_alert(
        config: OpsgenieConfig,
        message: str = None,
        description: str = None
) -> None:
    """
    Opens an alert in Opsgenie with the given message and description.

    Args:
        config (OpsgenieConfig): Opsgenie config dataclass
        message (str): The title of the alert.
        description (str): The message body of the alert.
    """
    url = config.url

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'GenieKey {config.api_key}'
    }

    payload = {
        'message': message,
        'description': description,
        'priority': config.priority,
        'responders': config.responders,
        'tags': config.tags,
        'details': config.details,
    }

    print(f'Creating Opsgenie Alert {payload}')
    response = requests.post(url, headers=headers, data=json.dumps(payload))

    if response.status_code == 202:
        print(f'Alert successfully opened: {message}')
    else:
        print(f'Unexpected response: {response.status_code} - {response.text}')
