import logging
import os

from alembic import command
from alembic.config import Config

from mage_ai.orchestration.db import db_connection_url


class DatabaseManager:
    def __init__(self):
        pass

    @property
    def script_location(self):
        pass

    def run_migrations(self, log_level=None):
        cur_dirpath = os.path.abspath(os.path.dirname(__file__))
        alembic_cfg = Config(
            os.path.join(cur_dirpath, 'alembic.ini'),
            attributes={'configure_logger': False},  # Do not configure logger
        )
        alembic_cfg.set_main_option(
            'script_location',
            os.path.join(cur_dirpath, 'migrations'),
        )
        try:
            alembic_cfg.set_main_option('sqlalchemy.url', db_connection_url)
        except ValueError:
            escaped_db_connection_url = db_connection_url.replace('%', '%%')
            alembic_cfg.set_main_option('sqlalchemy.url', escaped_db_connection_url)

        # Manually configure loggers so that the root logger does not get overwritten
        # by the alembic env.py file
        alembic_logger = logging.getLogger('alembic')
        if log_level is not None:
            alembic_logger.setLevel(log_level)
        elif alembic_logger.level == logging.NOTSET:
            alembic_logger.setLevel(logging.WARN)

        sqlalchemy_engine_logger = logging.getLogger('sqlalchemy.engine')
        if sqlalchemy_engine_logger.level == logging.NOTSET:
            sqlalchemy_engine_logger.setLevel(logging.WARN)

        command.upgrade(alembic_cfg, 'head')


class SqliteDatabaseManager(DatabaseManager):
    pass


database_manager = SqliteDatabaseManager()
