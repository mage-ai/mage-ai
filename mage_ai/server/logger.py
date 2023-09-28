from mage_ai.settings import SERVER_VERBOSITY
from mage_ai.shared.logger import LoggingLevel
import logging


class Logger:
    def new_server_logger(self, name):
        return self.new_logger_with_verbosity(name, SERVER_VERBOSITY)

    def new_logger_with_verbosity(self, name, level: str):
        server_logger = logging.getLogger(name)
        if LoggingLevel.is_valid_level(level):
            server_logger.setLevel(level.upper())
        else:
            print(f"invalid verbosity {level} for logger {name}")
        return server_logger
