from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.sql.utils.shared import interpolate_input
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.base_test import DBTestCase


class SQLBlockSharedUtilsTest(DBTestCase):
    def setUp(self):
        super().setUp()

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

    def test_interpolate_input(self):
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
