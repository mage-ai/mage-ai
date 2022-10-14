from alembic.config import Config
from alembic import command
from mage_ai.orchestration.db import db_connection_url
import os


class DatabaseManager:
    def __init__(self):
        pass

    @property
    def script_location(self):
        pass

    def run_migrations(self):
        cur_dirpath = os.path.abspath(os.path.dirname(__file__))
        alembic_cfg = Config(os.path.join(cur_dirpath, 'alembic.ini'))
        alembic_cfg.set_main_option(
            'script_location',
            os.path.join(cur_dirpath, 'migrations'),
        )
        alembic_cfg.set_main_option('sqlalchemy.url', db_connection_url)
        command.upgrade(alembic_cfg, 'head')


class SqliteDatabaseManager(DatabaseManager):
    pass


database_manager = SqliteDatabaseManager()
