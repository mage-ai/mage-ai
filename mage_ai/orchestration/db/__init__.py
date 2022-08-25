from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
import os

# TODO: Support Postgres
if os.path.exists('mage_ai/orchestration/db/'):
    DB_CONNECTION_URL = 'sqlite:///mage_ai/orchestration/db/mage-ai.db'
else:
    DB_CONNECTION_URL = 'sqlite:///mage-ai.db'

engine = create_engine(DB_CONNECTION_URL)
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)
session = Session()
