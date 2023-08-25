import json
import os
from typing import Optional

from mage_ai.orchestration.constants import (
    AWS_DB_SECRETS_NAME,
    PG_DB_HOST,
    PG_DB_NAME,
    PG_DB_PASS,
    PG_DB_PORT,
    PG_DB_USER,
)
from mage_ai.services.aws.secrets_manager.secrets_manager import get_secret


def get_postgres_connection_url() -> Optional[str]:
    db_user = None
    db_pass = None
    db_name = None
    db_host = None
    db_port = None
    if os.getenv(AWS_DB_SECRETS_NAME):
        try:
            response = get_secret(os.getenv(AWS_DB_SECRETS_NAME))
            secrets = json.loads(response)

            if secrets and secrets.get('engine') == 'postgres':
                db_user = secrets.get('username')
                db_pass = secrets.get('password')
                db_name = secrets.get('dbname')
                db_host = secrets.get('host', '127.0.0.1')
                db_port = secrets.get('port', '5432')

        except Exception as e:
            print("Unable to fetch secrets from AWS Secrets Manager", e)
    elif os.getenv(PG_DB_USER):
        db_user = os.getenv(PG_DB_USER)
        db_pass = os.getenv(PG_DB_PASS)
        db_name = os.getenv(PG_DB_NAME)
        db_host = os.getenv(PG_DB_HOST, '127.0.0.1')
        db_port = os.getenv(PG_DB_PORT, '5432')

    if db_user:
        return f'postgresql+psycopg2://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}'
