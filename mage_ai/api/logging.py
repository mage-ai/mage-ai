from datetime import datetime
from mage_ai.server.logger import Logger

LOGGER = Logger().new_server_logger(__name__)


def debug(text):
    now = datetime.utcnow().isoformat()
    LOGGER.debug(f'[{now}][api.views] {text}')


def error(text):
    now = datetime.utcnow().isoformat()

    LOGGER.error(f'[{now}][api.views] {text}')


def info(text):
    now = datetime.utcnow().isoformat()
    LOGGER.info(f'[{now}][api.views] {text}')
