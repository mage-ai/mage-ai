import logging

from mage_ai.settings import SERVER_VERBOSITY
from mage_ai.shared.custom_logger import DX_LOGGER
from mage_ai.shared.environments import is_deus_ex_machina
from mage_ai.shared.logger import LoggingLevel


class Logger:
    def new_server_logger(self, name):
        return self.new_logger_with_verbosity(name, SERVER_VERBOSITY)

    def new_logger_with_verbosity(self, name, level: str):
        if is_deus_ex_machina():
            server_logger = DX_LOGGER
        else:
            server_logger = logging.getLogger(name)
        if LoggingLevel.is_valid_level(level):
            server_logger.setLevel(level.upper())
        else:
            print(f'invalid verbosity {level} for logger {name}')
        return server_logger
