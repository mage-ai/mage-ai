from mage_ai.data_preparation.models.block.sql import split_query_string
from mage_ai.data_preparation.models.block.sql.utils.shared import (
    has_drop_statement,
    table_name_parts_from_query,
)
from mage_ai.tests.base_test import TestCase


class BlockTest(TestCase):
    def test_has_drop_statement(self):
        text1 = """
CREATE TABLE TEST_TABLE AS
SELECT * FROM USER;
"""
        text2 = """
DROP TABLE IF EXISTS TEST_TABLE
"""
        text3 = """
drop table TEST_TABLE
"""
        text4 = """
-- Delete the old table
drop table if exists test_table;
"""
        self.assertFalse(has_drop_statement(text1))
        self.assertTrue(has_drop_statement(text2))
        self.assertTrue(has_drop_statement(text3))
        self.assertTrue(has_drop_statement(text4))

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

    def test_table_name_parts_from_query(self):
        query1 = 'select * from demo_db1.demo_schema1.demo_table1'
        query2 = 'SELECT * FROM demo_db2.demo_schema2.demo_table2;'
        query3 = 'select * from demo_db3.demo_schema3.demo_table3 where "id"=1;'
        query4 = 'SELECT * from demo_table4'
        result1 = table_name_parts_from_query(query1)
        result2 = table_name_parts_from_query(query2)
        result3 = table_name_parts_from_query(query3)
        result4 = table_name_parts_from_query(query4)

        self.assertEqual(result1, ('demo_db1', 'demo_schema1', 'demo_table1'))
        self.assertEqual(result2, ('demo_db2', 'demo_schema2', 'demo_table2'))
        self.assertEqual(result3, ('demo_db3', 'demo_schema3', 'demo_table3'))
        self.assertEqual(result4, None)
