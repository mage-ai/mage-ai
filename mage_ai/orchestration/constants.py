import enum

DATABASE_CONNECTION_URL_ENV_VAR = 'MAGE_DATABASE_CONNECTION_URL'

AWS_DB_SECRETS_NAME = 'AWS_DB_SECRETS_NAME'
AZURE_SECRET_DB_CONN_URL = 'AZURE_SECRET_DB_CONN_URL'

# ============= Postgres credentials =============

PG_DB_USER = 'DB_USER'
PG_DB_PASS = 'DB_PASS'
PG_DB_HOST = 'DB_HOST'
PG_DB_PORT = 'DB_PORT'
PG_DB_NAME = 'DB_NAME'

# ================================================

PIPELINE_RUN_MAGE_VARIABLES_KEY = '__mage_variables'


class Entity(str, enum.Enum):
    # Permissions saved to the DB should not have the "ANY" entity. It should only be used
    # when evaluating permissions.
    ANY = 'any'
    GLOBAL = 'global'
    PROJECT = 'project'
    PIPELINE = 'pipeline'
