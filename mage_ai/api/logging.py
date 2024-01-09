import os
from datetime import datetime

from mage_ai.server.logger import Logger

LOGGER = Logger().new_server_logger(__name__)


def debug(text):
    if not os.getenv('DISABLE_API_TERMINAL_OUTPUT'):
        now = datetime.utcnow().isoformat()
        LOGGER.debug(f'[{now}][api.views] {text}')


def error(text):
    if not os.getenv('DISABLE_API_TERMINAL_OUTPUT'):
        now = datetime.utcnow().isoformat()
        LOGGER.error(f'[{now}][api.views] {text}')


def info(text):
    if not os.getenv('DISABLE_API_TERMINAL_OUTPUT'):
        now = datetime.utcnow().isoformat()
        LOGGER.info(f'[{now}][api.views] {text}')
