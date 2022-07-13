from mage_ai.io.file import FileIO
from mage_ai.io.postgres import Postgres
from tests.base_test import TestCase


class DataLoaderTests(TestCase):
    def test_limit_modifier(self):
        handler = Postgres('test', 'test', 'test', 'test', 'test', True)
        test_queries = [
            'select * from value;',
            'SELECT * FROM table where x > 5 limit 100000000',
            'select * from table WHERE x > 5 LiMiT 1000;',
            'Select * From dataset wHeRe y < -230.2 Order By z LiMiT ALL',
            'Select * From dataset wHeRe y < -230.2 Order By z LiMiT OFFSET 10',
            'Select * From dataset wHeRe y < -230.2 Order By z LiMiT 1000000000 FOR UPDATE OF dataset NOWAIT',
            'Select * From dataset wHeRe y < -230.2 Order By z FOR UPDATE OF dataset NOWAIT;',
            'Select * From dataset wHeRe y < -230.2 Order By z Limit 10 FOR UPDATE OF dataset NOWAIT',
        ]

        expected_queries = [
            'select * from value LIMIT 100000;',
            'SELECT * FROM table where x > 5 LIMIT 100000;',
            'select * from table WHERE x > 5 LiMiT 1000;',
            'Select * From dataset wHeRe y < -230.2 Order By z LIMIT 100000;',
            'Select * From dataset wHeRe y < -230.2 Order By z LIMIT 100000 OFFSET 10;',
            'Select * From dataset wHeRe y < -230.2 Order By z LIMIT 100000 FOR UPDATE OF dataset NOWAIT;',
            'Select * From dataset wHeRe y < -230.2 Order By z LIMIT 100000 FOR UPDATE OF dataset NOWAIT;',
            'Select * From dataset wHeRe y < -230.2 Order By z Limit 10 FOR UPDATE OF dataset NOWAIT;',
        ]

        for test_query, expected_query in zip(test_queries, expected_queries):
            self.assertEqual(handler._enforce_limit(test_query, 100000), expected_query)
