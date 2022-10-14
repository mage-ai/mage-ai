from mage_ai.orchestration.constants import DATABASE_CONNECTION_URL_ENV_VAR
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
import os


class DBConnection:
    def __init__(self):
        self.db_connection_url = os.getenv(DATABASE_CONNECTION_URL_ENV_VAR)

        if self.db_connection_url is None:
            if os.path.exists('mage_ai/orchestration/db/'):
                self.db_connection_url = 'sqlite:///mage_ai/orchestration/db/mage-ai.db'
            else:
                self.db_connection_url = 'sqlite:///mage-ai.db'

    def start_session(self):
        self.engine = create_engine(self.db_connection_url)
        session_factory = sessionmaker(bind=self.engine)
        self.Session = scoped_session(session_factory)
        self.session = self.Session()

        self.engine.dispose()

        

db_connection = DBConnection()
