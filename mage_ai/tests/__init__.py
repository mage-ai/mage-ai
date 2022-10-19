from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.database_manager import database_manager

if db_connection.session is None:
    database_manager.run_migrations()
    db_connection.start_session()
