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
        db_connection_url = 'sqlite:///mage_ai/orchestration/db/mage-ai.db'
    else:
        db_connection_url = 'sqlite:///mage-ai.db'
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
        self.session = scoped_session(session_factory)

    def close_session(self):
        self.session.close()


db_connection = DBConnection()
