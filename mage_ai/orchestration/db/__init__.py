from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
import os

from mage_ai.orchestration.constants import DATABASE_CONNECTION_URL_ENV_VAR
 

db_connection_url = os.getenv(DATABASE_CONNECTION_URL_ENV_VAR)

if db_connection_url is None:
    if os.path.exists('mage_ai/orchestration/db/'):
        db_connection_url = 'sqlite:///mage_ai/orchestration/db/mage-ai.db'
    else:
        db_connection_url = 'sqlite:///mage-ai.db'

engine = create_engine(db_connection_url)
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)
session = Session()
