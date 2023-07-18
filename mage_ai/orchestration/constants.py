import enum

DATABASE_CONNECTION_URL_ENV_VAR = 'MAGE_DATABASE_CONNECTION_URL'

DB_USER = 'DB_USER'
DB_PASS = 'DB_PASS'
DB_NAME = 'DB_NAME'

PIPELINE_RUN_MAGE_VARIABLES_KEY = '__mage_variables'


class Entity(str, enum.Enum):
    # Permissions saved to the DB should not have the "ANY" entity. It should only be used
    # when evaluating permissions.
    ANY = 'any'
    GLOBAL = 'global'
    PROJECT = 'project'
    PIPELINE = 'pipeline'
