from mage_ai.data_preparation.repo_manager import get_variables_dir
from mage_ai.orchestration.constants import (
    DATABASE_CONNECTION_URL_ENV_VAR,
    DB_NAME,
    DB_PASS,
    DB_USER
)
from mage_ai.shared.environments import is_test
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
import logging
import os
import sqlalchemy

DB_RETRY_COUNT = 2
TEST_DB = 'test.db'

db_connection_url = os.getenv(DATABASE_CONNECTION_URL_ENV_VAR)
db_kwargs = dict(
    connect_args={},
    pool_pre_ping=True,
)

if is_test():
    db_connection_url = f'sqlite:///{TEST_DB}'
elif not db_connection_url:
    # connect to K8s CloudSQL sidecar
    if os.getenv(DB_USER):
        db_user = os.getenv(DB_USER)
        db_pass = os.getenv(DB_PASS)
        db_name = os.getenv(DB_NAME)
        db_connection_url = f'postgresql+psycopg2://{db_user}:{db_pass}@127.0.0.1:5432/{db_name}'
    else:
        if is_test():
            db_connection_url = f'sqlite:///{TEST_DB}'
        elif os.path.exists('mage_ai/orchestration/db/'):
            # For local dev environment
            db_connection_url = 'sqlite:///mage_ai/orchestration/db/mage-ai.db'
        elif os.path.exists('mage-ai.db'):
            # For backward compatiblility
            db_connection_url = f'sqlite:///{get_variables_dir()}/mage-ai.db'
        else:
            # For new projects, create mage-ai.db in variables idr
            db_connection_url = f'sqlite:///{get_variables_dir()}/mage-ai.db'
        db_kwargs['connect_args']['check_same_thread'] = False

if db_connection_url.startswith('postgresql'):
    db_kwargs['pool_size'] = 50
    db_kwargs['connect_args']['options'] = '-c timezone=utc'

engine = create_engine(
    db_connection_url,
    **db_kwargs,
)
session_factory = sessionmaker(bind=engine)


class DBConnection:
    def __init__(self):
        self.session = None

    def start_session(self, force: bool = False):
        if self.session is not None and self.session.is_active and not force:
            return
        self.session = scoped_session(session_factory)

    def close_session(self):
        self.session.close()
        self.session = None


db_connection = DBConnection()


def safe_db_query(func):
    def func_with_rollback(*args, **kwargs):
        retry_count = 0
        while True:
            try:
                return func(*args, **kwargs)
            except (sqlalchemy.exc.OperationalError, sqlalchemy.exc.PendingRollbackError) as e:
                db_connection.session.rollback()
                if retry_count >= DB_RETRY_COUNT:
                    raise e
                retry_count += 1
    return func_with_rollback


logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
