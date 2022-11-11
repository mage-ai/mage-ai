from mage_ai.data_preparation.repo_manager import get_variables_dir
from mage_ai.orchestration.constants import DATABASE_CONNECTION_URL_ENV_VAR
from mage_ai.shared.environments import is_test
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
import os

TEST_DB = 'test.db'

db_connection_url = os.getenv(DATABASE_CONNECTION_URL_ENV_VAR)
db_kwargs = dict(pool_pre_ping=True)

if not db_connection_url:
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
    db_kwargs['connect_args'] = {'check_same_thread': False}

engine = create_engine(
    db_connection_url,
    **db_kwargs,
)
session_factory = sessionmaker(bind=engine)


class DBConnection:
    def __init__(self):
        self.session = None

    def start_session(self):
        if self.session is not None and self.session.is_active:
            return
        self.session = scoped_session(session_factory)

    def close_session(self):
        self.session.close()
        self.session = None


db_connection = DBConnection()
