from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.sql.utils.shared import (
    extract_create_statement_table_name,
    extract_drop_statement_table_names,
    extract_insert_statement_table_names,
    extract_update_statement_table_names,
    interpolate_input,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.base_test import DBTestCase


class SQLBlockSharedUtilsTest(DBTestCase):
    def test_extract_create_statement_table_name(self):
        # Test case 1: Basic CREATE TABLE statement
        text = """
        -- This is a comment
        CREATE TABLE table_name (
            column1 INT,
            column2 VARCHAR(255)
        );
        """
        expected_result = 'table_name'
        self.assertEqual(extract_create_statement_table_name(text), expected_result)

        # Test case 2: CREATE TABLE IF NOT EXISTS
        text = """
        CREATE TABLE IF NOT EXISTS schema.table_name (
            column1 INT,
            column2 VARCHAR(255)
        );
        """
        expected_result = 'schema.table_name'
        self.assertEqual(extract_create_statement_table_name(text), expected_result)

        # Test case 3: No CREATE TABLE statement
        text = """
        SELECT * FROM table_name;
        """
        self.assertIsNone(extract_create_statement_table_name(text))

        # Test case 4: CREATE TABLE with additional clauses
        text = """
        CREATE TABLE IF NOT EXISTS schema.table_name
        ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
        WITH SERDEPROPERTIES (
            "separatorChar" = "\\t",
            "quoteChar"     = "'",
            "escapeChar"    = "\\\\"
        )
        STORED AS TEXTFILE;
        """
        expected_result = 'schema.table_name'
        self.assertEqual(extract_create_statement_table_name(text), expected_result)

    def test_extract_insert_statement_table_names(self):
        # Test case 1: Basic test with one INSERT statement and remove comment
        text = """
        -- This is a comment
        INSERT INTO table_name
        VALUES (1, 'John');
        """
        expected_result = ['table_name']
        self.assertEqual(extract_insert_statement_table_names(text), expected_result)

        # Test case 2: INSERT INTO with overwrite
        text = """
        INSERT OVERWRITE INTO database.table1
        SELECT * FROM source_table;
        """
        expected_result = ['database.table1']
        self.assertEqual(extract_insert_statement_table_names(text), expected_result)

        # Test case 3: No INSERT statements
        text = """
        SELECT * FROM table_name;
        """
        expected_result = []
        self.assertEqual(extract_insert_statement_table_names(text), expected_result)

        # Test case 4: Multiple INSERT statements
        text = """
            INSERT INTO table1 VALUES (1, 'John');
            INSERT INTO table2 VALUES (2, 'Jane');
            """
        expected_result = ["table1", "table2"]
        self.assertEqual(extract_insert_statement_table_names(text), expected_result)

        # Test case 5: IGNORE INSERT statement
        text = "INSERT IGNORE INTO table3 VALUES (3, 'Alice');"
        expected_result = ["table3"]
        self.assertEqual(extract_insert_statement_table_names(text), expected_result)

        # Test case 6: case insensitivity
        text = "insert into TABLE5 values (5, 'Eve');"
        expected_result = ["TABLE5"]
        self.assertEqual(extract_insert_statement_table_names(text), expected_result)

        # Test case 7: Multiple spaces
        text = """
        INSERT   INTO   table_name VALUES (1, 'John');
        """
        expected_result = ['table_name']
        self.assertEqual(extract_insert_statement_table_names(text), expected_result)

    def test_extract_drop_statement_table_names(self):
        # Test case 1: Basic DROP TABLE statement
        text = """
        -- This is a comment
        DROP TABLE table_name;
        """
        expected_result = ['table_name']
        self.assertEqual(extract_drop_statement_table_names(text), expected_result)

        # Test case 2: DROP TABLE IF EXISTS
        text = """
        drop table if exists schema.table1;
        """
        expected_result = ['schema.table1']
        self.assertEqual(extract_drop_statement_table_names(text), expected_result)

        # Test case 3: No DROP TABLE statements
        text = """
        SELECT * FROM table_name;
        """
        expected_result = []
        self.assertEqual(extract_drop_statement_table_names(text), expected_result)

    def test_extract_update_statement_table_names(self):
        # Test case 1: Basic test with one UPDATE statement
        text = """
        -- This is a comment
        UPDATE table_name
        SET column1 = value1, column2 = value2
        WHERE condition;
        """
        expected_result = ['table_name']
        self.assertEqual(extract_update_statement_table_names(text), expected_result)

        # Test case 2: Multiple UPDATE statements
        text = """
        UPDATE table1
        SET column1 = value1, column2 = value2
        WHERE condition;

        Another UPDATE statement here.

        update table2
        set column3 = value3
        where another_condition;
        """
        expected_result = ['table1', 'table2']
        self.assertEqual(extract_update_statement_table_names(text), expected_result)

        # Test case 3: No UPDATE statements
        text = """
        SELECT * FROM table_name;
        """
        expected_result = []
        self.assertEqual(extract_update_statement_table_names(text), expected_result)

        # Test case 4: UPDATE statement with alias
        text = """
        UPDATE table_name as x
        SET column1 = value1, column2 = value2
        WHERE condition;
        """
        expected_result = ['table_name']
        self.assertEqual(extract_update_statement_table_names(text), expected_result)

    def test_interpolate_input(self):
        self.pipeline = Pipeline.create(
            'test pipeline',
            repo_path=self.repo_path,
        )

        configuration = dict(
            data_provider='data_provider',
            data_provider_database='data_provider_database',
            data_provider_schema='data_provider_schema',
            use_raw_sql=True,
        )
        shared_props = dict(
            configuration=configuration,
            language=BlockLanguage.SQL,
            pipeline=self.pipeline,
        )

        data_loader_1 = Block(
            'data_loader_1',
            'data_loader_1',
            BlockType.DATA_LOADER,
            **shared_props,
            content="""
WITH
test AS (
SELECT 1 AS id2, 2 AS "with"
)

SELECT
id as unique_id,split_part(name, ' ', 1) AS "first           name----1!"
, name AS last_name
FROM "mage"."account_v6"
INNER JOIN test
ON 1 = 1
""",
        )

        data_loader_2 = Block(
            'data_loader_2',
            'data_loader_2',
            BlockType.DATA_LOADER,
            **shared_props,
            content="""
SELECT
id AS unique_id
, name AS first_name
, type AS last_name
FROM "mage"."account_v6" AS "on"
""",
        )

        data_exporter = Block(
            'data_exporter',
            'data_exporter',
            BlockType.DATA_EXPORTER,
            **shared_props,
            content="""
SELECT
a.*
FROM {{df_1}} AS "a"

INNER JOIN {{ df_2 }} AS b
ON a.unique_id = b.unique_id

INNER JOIN {{ df_2 }}
on 1 = 1

INNER JOIN {{ df_2 }} c
ON 1 = 1

INNER JOIN {{ df_2 }} AS d
ON 1 = 1

INNER JOIN {{ df_2 }} as e
ON 1 = 1

INNER JOIN {{ df_2 }} AS "f"
ON 1 = 1

INNER JOIN {{ df_2 }} as "g"
ON 1 = 1

INNER JOIN {{ df_2 }} "on"
ON 1 = 1
"""
        )

        self.pipeline.add_block(data_loader_1)
        self.pipeline.add_block(data_loader_2)
        self.pipeline.add_block(data_exporter, [
            data_loader_1.uuid,
            data_loader_2.uuid,
        ])
        data_exporter = self.pipeline.get_block('data_exporter')

        query_string = interpolate_input(
            data_exporter,
            data_exporter.content,
        )

        self.assertEqual(query_string.strip(), """
SELECT
a.*
FROM (
WITH
test AS (
SELECT 1 AS id2, 2 AS "with"
)

SELECT
id as unique_id,split_part(name, ' ', 1) AS "first           name----1!"
, name AS last_name
FROM "mage"."account_v6"
INNER JOIN test
ON 1 = 1
) AS "a"

INNER JOIN (
SELECT
id AS unique_id
, name AS first_name
, type AS last_name
FROM "mage"."account_v6" AS "on"
) AS b
ON a.unique_id = b.unique_id

INNER JOIN (
SELECT
id AS unique_id
, name AS first_name
, type AS last_name
FROM "mage"."account_v6" AS "on"
) AS test_pipeline_data_loader_2_v1
on 1 = 1

INNER JOIN (
SELECT
id AS unique_id
, name AS first_name
, type AS last_name
FROM "mage"."account_v6" AS "on"
) c
ON 1 = 1

INNER JOIN (
SELECT
id AS unique_id
, name AS first_name
, type AS last_name
FROM "mage"."account_v6" AS "on"
) AS d
ON 1 = 1

INNER JOIN (
SELECT
id AS unique_id
, name AS first_name
, type AS last_name
FROM "mage"."account_v6" AS "on"
) as e
ON 1 = 1

INNER JOIN (
SELECT
id AS unique_id
, name AS first_name
, type AS last_name
FROM "mage"."account_v6" AS "on"
) AS "f"
ON 1 = 1

INNER JOIN (
SELECT
id AS unique_id
, name AS first_name
, type AS last_name
FROM "mage"."account_v6" AS "on"
) as "g"
ON 1 = 1

INNER JOIN (
SELECT
id AS unique_id
, name AS first_name
, type AS last_name
FROM "mage"."account_v6" AS "on"
) "on"
ON 1 = 1
""".strip())
