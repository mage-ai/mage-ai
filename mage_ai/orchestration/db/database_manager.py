from alembic.config import Config
from alembic import command
from mage_ai.orchestration.db import db_connection_url
from mage_ai.shared.logger import LoggingLevel
import os


class DatabaseManager:
    def __init__(self):
        pass

    @property
    def script_location(self):
        pass

    def run_migrations(self, log_level: LoggingLevel = None):
        cur_dirpath = os.path.abspath(os.path.dirname(__file__))
        alembic_cfg = Config(os.path.join(cur_dirpath, 'alembic.ini'))
        alembic_cfg.set_main_option(
            'script_location',
            os.path.join(cur_dirpath, 'migrations'),
        )
        alembic_cfg.set_main_option('sqlalchemy.url', db_connection_url)
        if log_level is not None:
            alembic_cfg.set_section_option('logger_alembic', 'level', log_level)
        command.upgrade(alembic_cfg, 'head')


class SqliteDatabaseManager(DatabaseManager):
    pass


database_manager = SqliteDatabaseManager()
