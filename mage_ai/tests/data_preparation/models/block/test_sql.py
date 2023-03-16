from mage_ai.data_preparation.models.block.sql import split_query_string
from mage_ai.tests.base_test import TestCase


class BlockTest(TestCase):
    def test_split_query_string(self):
        query_string = """
COPY public.temp_table FROM 's3://bucket/object_key/filename.csv'
  CREDENTIALS 'aws_access_key_id=abc123;aws_secret_access_key=efg456'
  CSV
  IGNOREHEADER 1;

INSERT INTO schema_1.table_v1
    SELECT 4 AS id
    UNION ALL
    SELECT 6 AS id;

-- CREATE TABLE
-- COMMENT


INSERT INTO schema_2.table_v2 SELECT 3 AS id UNION ALL
SELECT 5 AS id;
"""
        queries = split_query_string(query_string)

        self.assertEqual(len(queries), 3)

        self.assertEqual(
            queries[0],
            """COPY public.temp_table FROM 's3://bucket/object_key/filename.csv'
  CREDENTIALS 'aws_access_key_id=abc123;aws_secret_access_key=efg456'
  CSV
  IGNOREHEADER 1""")

        self.assertEqual(queries[1], """INSERT INTO schema_1.table_v1
    SELECT 4 AS id
    UNION ALL
    SELECT 6 AS id""")

        self.assertEqual(queries[2], """INSERT INTO schema_2.table_v2 SELECT 3 AS id UNION ALL
SELECT 5 AS id""")
