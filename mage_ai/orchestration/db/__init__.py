from mage_ai.orchestration.constants import DATABASE_CONNECTION_URL_ENV_VAR
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
import os


db_connection_url = os.getenv(DATABASE_CONNECTION_URL_ENV_VAR)

if not db_connection_url:
    if os.path.exists('mage_ai/orchestration/db/'):
        db_connection_url = 'sqlite:///mage_ai/orchestration/db/mage-ai.db'
    else:
        db_connection_url = 'sqlite:///mage-ai.db'

engine = create_engine(db_connection_url, pool_pre_ping=True)
session_factory = sessionmaker(bind=engine)

class DBConnection:
    def __init__(self):
        pass

    def start_session(self):
        self.session = scoped_session(session_factory)

    def close_session(self):
        self.session.close()

db_connection = DBConnection()
