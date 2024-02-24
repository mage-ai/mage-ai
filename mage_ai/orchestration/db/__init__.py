import logging
import os
from urllib.parse import parse_qs, quote_plus, urlparse

import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import scoped_session, sessionmaker

from mage_ai.orchestration.constants import DATABASE_CONNECTION_URL_ENV_VAR
from mage_ai.orchestration.db.cache import CachingQuery, SessionWithCaching
from mage_ai.orchestration.db.setup import get_postgres_connection_url
from mage_ai.orchestration.db.utils import get_user_info_from_db_connection_url
from mage_ai.settings import OTEL_EXPORTER_OTLP_ENDPOINT
from mage_ai.settings.repo import get_variables_dir
from mage_ai.shared.environments import is_dev, is_test

DB_RETRY_COUNT = 2
TEST_DB = 'test.db'

db_connection_url = os.getenv(DATABASE_CONNECTION_URL_ENV_VAR)
db_kwargs = dict(
    connect_args={},
    pool_pre_ping=True,
)

# Only import if OpenTelemetry is enabled
if OTEL_EXPORTER_OTLP_ENDPOINT:
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

if is_test():
    db_connection_url = f'sqlite:///{TEST_DB}'
elif not db_connection_url:
    pg_db_connection_url = get_postgres_connection_url()

    if pg_db_connection_url:
        db_connection_url = pg_db_connection_url
    else:
        if is_test():
            db_connection_url = f'sqlite:///{TEST_DB}'
        elif os.path.exists(os.path.join('mage_ai', 'orchestration', 'db')):
            # For local dev environment
            db_connection_url = 'sqlite:///mage_ai/orchestration/db/mage-ai.db'
        elif os.path.exists('mage-ai.db'):
            # For backward compatiblility
            db_connection_url = f'sqlite:///{get_variables_dir()}/mage-ai.db'
        else:
            # For new projects, create mage-ai.db in variables dir
            db_connection_url = f'sqlite:///{get_variables_dir()}/mage-ai.db'
        db_kwargs['connect_args']['check_same_thread'] = False

if db_connection_url.startswith('postgresql'):
    db_kwargs['pool_size'] = 50
    db_kwargs['connect_args']['options'] = '-c timezone=utc'

try:
    # if OpenTelemetry is enabled, instrument SQLAlchemy
    if os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT'):
        SQLAlchemyInstrumentor().instrument(enable_commenter=True, commenter_options={})

    engine = create_engine(
        db_connection_url,
        **db_kwargs,
    )
    engine.connect()
except SQLAlchemyError:
    engine.dispose()
    username, password = get_user_info_from_db_connection_url(db_connection_url)
    if password:
        db_connection_url = db_connection_url.replace(
            password,
            quote_plus(password),
        )
        engine = create_engine(
            db_connection_url,
            **db_kwargs,
        )


session_factory = sessionmaker(
    class_=SessionWithCaching,
    bind=engine,
    query_cls=CachingQuery,
)


class DBConnection:
    def __init__(self):
        self.session = None

    def start_session(self, force: bool = False):
        if self.session is not None and self.session.is_active and not force:
            return
        self.session = scoped_session(session_factory)

    def close_session(self):
        self.session.close()
        self.session = None

    def start_cache(self):
        if hasattr(self.session.registry.registry, 'value'):
            if hasattr(self.session.registry.registry.value, 'start_cache'):
                self.session.registry.registry.value.start_cache()

    def stop_cache(self):
        if hasattr(self.session.registry.registry, 'value'):
            if hasattr(self.session.registry.registry.value, 'stop_cache'):
                self.session.registry.registry.value.stop_cache()


def get_postgresql_schema(url):
    try:
        parse_result = urlparse(url)
    except ValueError:
        return None
    if parse_result.scheme == 'postgresql+psycopg2':
        q = parse_qs(parse_result.query.replace('%%', '%'))
        options = q.get('options')
        if options and len(options) >= 1:
            params = options[0].replace('-c ', '').split(' ')
            kvs = dict(p.split('=') for p in params)
            return kvs.get('search_path')


db_connection = DBConnection()


def set_db_schema():
    if db_connection_url.startswith('postgresql'):
        db_schema = get_postgresql_schema(db_connection_url)
        if db_schema:
            db_connection.start_session()
            db_connection.session.execute(f'CREATE SCHEMA IF NOT EXISTS {db_schema};')
            # Get the current database name from the query fetchall() result
            # e.g., [('test_database',)]
            db_current = db_connection.session.execute(
                'SELECT current_database()'
            ).fetchall()[0][0]
            username, _ = get_user_info_from_db_connection_url(db_connection_url)
            if username:
                db_connection.session.execute(
                    f'ALTER ROLE {username} IN DATABASE {db_current} SET search_path TO {db_schema}'
                )
                db_connection.session.commit()
                db_connection.close_session()
                print(
                    f'Set the default PostgreSQL schema for role {username} ',
                    f'in database {db_current} to {db_schema}',
                )


def safe_db_query(func):
    def func_with_rollback(*args, **kwargs):
        retry_count = 0
        while True:
            try:
                return func(*args, **kwargs)
            except (
                sqlalchemy.exc.OperationalError,
                sqlalchemy.exc.PendingRollbackError,
                sqlalchemy.exc.InternalError,
            ) as e:
                db_connection.session.rollback()
                if retry_count >= DB_RETRY_COUNT:
                    raise e
                retry_count += 1

    return func_with_rollback


logging.basicConfig()

if is_dev() and not os.getenv('DISABLE_DATABASE_TERMINAL_OUTPUT'):
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
