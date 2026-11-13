import unittest

from sqlalchemy import create_engine, event, literal, select
from sqlalchemy.orm import scoped_session, sessionmaker

from mage_ai.orchestration.db import DBConnection
from mage_ai.orchestration.db.cache import SessionWithCaching


class SessionWithCachingTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://')
        self.query_count = 0

        @event.listens_for(self.engine, 'before_cursor_execute')
        def count_query(*_args):
            self.query_count += 1

        self.session = SessionWithCaching(bind=self.engine)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_execute_with_cache_reuses_results(self):
        self.session.start_cache()
        statement = select(literal(1).label('value'))

        first = self.session.execute_with_cache(statement, cache=True, result_type='all')
        second = self.session.execute_with_cache(statement, cache=True, result_type='all')

        self.assertEqual(first, second)
        self.assertEqual(1, self.query_count)

    def test_db_connection_routes_scoped_session_through_cache(self):
        connection = DBConnection()
        connection.session = scoped_session(sessionmaker(
            bind=self.engine,
            class_=SessionWithCaching,
        ))
        connection.start_cache()
        statement = select(literal(1).label('value'))

        connection.execute_with_cache(statement, cache=True, result_type='all')
        connection.execute_with_cache(statement, cache=True, result_type='all')

        self.assertEqual(1, self.query_count)
        connection.close_session()
