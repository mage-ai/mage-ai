import contextlib
import enum
import logging
import os
from typing import Generator

from alembic import command
from alembic.config import Config
from sqlalchemy import text

from mage_ai.orchestration.db import db_connection, db_connection_url


@enum.unique
class DBLocks(enum.IntEnum):
    """
    Cross-db Identifiers for advisory global database locks.

    Postgres uses int64 lock ids so we use the integer value, MySQL uses names, so we
    call ``str()`, which is implemented using the ``_name_`` field.

    Based on airflow.utils.db.DBLocks
    """

    MIGRATIONS = enum.auto()

    def __str__(self):
        return f'mage_{self._name_}'


@contextlib.contextmanager
def create_db_lock(
    session,
    lock: DBLocks,
    lock_timeout: int = 30000,  # 30 seconds
) -> Generator[None, None, None]:
    """
    Contextmanager that will create and teardown a global db lock.

    Based on airflow.utils.db.create_global_lock
    """
    conn = session.get_bind().connect()
    dialect = conn.dialect

    lock_acquired = False

    try:
        if dialect.name == 'postgresql':
            conn.execute(
                text('SET LOCK_TIMEOUT to :timeout'), {'timeout': lock_timeout}
            )
            conn.execute(text('SELECT pg_advisory_lock(:id)'), {'id': lock.value})
        elif dialect.name == 'mysql' and dialect.server_version_info >= (5, 6):
            conn.execute(
                text('SELECT GET_LOCK(:id, :timeout)'),
                {'id': str(lock), 'timeout': lock_timeout},
            )

        lock_acquired = True
        yield
    finally:
        if dialect.name == 'postgresql':
            conn.execute(text('SET LOCK_TIMEOUT TO DEFAULT'))
            (unlocked,) = conn.execute(
                text('SELECT pg_advisory_unlock(:id)'), {'id': lock.value}
            ).fetchone()
            if lock_acquired and not unlocked:
                raise RuntimeError('Error releasing DB lock!')
        elif dialect.name == 'mysql' and dialect.server_version_info >= (5, 6):
            conn.execute(text('select RELEASE_LOCK(:id)'), {'id': str(lock)})

        conn.close()


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
        alembic_logger = logging.getLogger('alembic.runtime.migration')
        if log_level is not None:
            alembic_logger.setLevel(log_level)
        elif alembic_logger.level == logging.NOTSET:
            alembic_logger.setLevel(logging.INFO)

        sqlalchemy_engine_logger = logging.getLogger('sqlalchemy.engine')
        if sqlalchemy_engine_logger.level == logging.NOTSET:
            sqlalchemy_engine_logger.setLevel(logging.WARN)

        if db_connection.session is None:
            db_connection.start_session()
        with create_db_lock(db_connection.session, DBLocks.MIGRATIONS):
            command.upgrade(alembic_cfg, revision='head')


class SqliteDatabaseManager(DatabaseManager):
    pass


database_manager = SqliteDatabaseManager()
