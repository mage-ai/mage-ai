import requests

from mage_ai.server.logger import Logger
from mage_ai.services.ntfy.config import NtfyConfig

logger = Logger().new_server_logger(__name__)


def send_ntfy_message(config: NtfyConfig, message: str, title: str) -> None:
    payload = {'topic': config.topic, 'message': message}
    if title:
        payload['title'] = title

    response = requests.post(
        url=config.base_url,
        json=payload,
    )

    try:
        if response is not None:
            response.raise_for_status()
    except requests.exceptions.HTTPError:
        logger.exception('Failed to send ntfy message')
