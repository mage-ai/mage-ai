from __future__ import annotations

from pathlib import Path

from mage_omd_lineage import errors
from mage_omd_lineage.analyze.catalog import DictCatalog, NullCatalog
from mage_omd_lineage.analyze.sql import analyze_sql_block, dialect_for
from mage_omd_lineage.config import Config
from mage_omd_lineage.ir import (
    CONFIDENCE_EXACT,
    CONFIDENCE_INFERRED,
    CONFIDENCE_TABLE_ONLY,
    Block,
    Pipeline,
)

CATALOG = DictCatalog(
    {
        "analytics.raw.orders": [
            "id",
            "customer_id",
            "amount",
            "status",
            "ordered_at",
        ],
        "analytics.raw.customers": ["id", "country"],
    }
)


def make_config(tmp_path: Path) -> Config:
    return Config.from_dict(
        {
            "profiles": {
                "default": {
                    "service": "warehouse",
                    "driver": "postgres",
                    "database": "analytics",
                    "default_schema": "public",
                }
            },
            "pipelines": {"p1": {"enabled": True}},
        },
        tmp_path / "omd_lineage.yaml",
    )


def make_pipeline(sql: str, block_uuid: str = "b1", **configuration) -> Pipeline:
    block = Block(
        uuid=block_uuid,
        name=block_uuid,
        type="transformer",
        language="sql",
        code=sql,
        upstream=[],
        configuration={
            "data_provider": "postgres",
            "data_provider_database": "analytics",
            **configuration,
        },
    )
    return Pipeline(
        uuid="p1", name="p1", project="proj", blocks={block_uuid: block}
    )


def test_dialect_mapping():
    assert dialect_for("postgres") == "postgres"
    assert dialect_for("mariadb") == "mysql"
    assert dialect_for("not-a-driver") is None


def test_cte_insert_produces_physical_edge(tmp_path):
    sql = """
    WITH cleaned AS (
        SELECT o.id AS order_id, o.customer_id, CAST(o.amount AS DECIMAL(10, 2)) AS amount
        FROM raw.orders o
        WHERE o.status = 'complete'
    )
    INSERT INTO stg.orders_clean
    SELECT c.order_id, c.customer_id, c.amount, c.amount * 1.1 AS amount_with_tax
    FROM cleaned c
    """
    pipeline = make_pipeline(sql, data_provider_schema="stg")
    transform = analyze_sql_block(pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG)

    assert [key.label for key in transform.outputs] == ["analytics.stg.orders_clean"]
    assert [key.label for key in transform.inputs] == ["analytics.raw.orders"]
    assert transform.confidence == CONFIDENCE_EXACT

    origins = {
        name: [
            (origin.table.raw if origin.table else None, origin.column)
            for origin in mapping.origins
        ]
        for name, mapping in transform.columns.items()
    }
    assert origins["order_id"] == [("analytics.raw.orders", "id")]
    assert origins["amount_with_tax"] == [("analytics.raw.orders", "amount")]
    assert transform.columns["amount_with_tax"].function == "c.amount * 1.1"


def test_ctas_target_from_statement(tmp_path):
    sql = (
        "CREATE TABLE mart.summary AS "
        "SELECT customer_id, COUNT(*) AS orders FROM raw.orders GROUP BY customer_id"
    )
    pipeline = make_pipeline(sql)
    transform = analyze_sql_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert [key.label for key in transform.outputs] == ["analytics.mart.summary"]
    assert transform.columns["orders"].function == "COUNT(*)"


def test_star_expands_from_catalog(tmp_path):
    sql = "INSERT INTO stg.copy SELECT * FROM raw.customers"
    pipeline = make_pipeline(sql, data_provider_schema="stg")
    transform = analyze_sql_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert list(transform.columns) == ["id", "country"]
    assert transform.confidence == CONFIDENCE_EXACT
    assert not transform.issues


def test_star_without_catalog_is_partial(tmp_path):
    sql = "INSERT INTO stg.copy SELECT * FROM raw.customers"
    pipeline = make_pipeline(sql, data_provider_schema="stg")
    transform = analyze_sql_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), NullCatalog()
    )
    assert transform.columns == {}
    assert transform.confidence == CONFIDENCE_TABLE_ONLY
    assert any(issue.code == errors.STAR_UNRESOLVED for issue in transform.issues)


def test_unknown_column_reports_column_missing(tmp_path):
    sql = "INSERT INTO stg.copy SELECT c.does_not_exist FROM raw.customers c"
    pipeline = make_pipeline(sql, data_provider_schema="stg")
    transform = analyze_sql_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert any(issue.code == errors.COLUMN_MISSING for issue in transform.issues)
    assert transform.confidence == CONFIDENCE_INFERRED


def test_parse_error_is_not_fatal(tmp_path):
    pipeline = make_pipeline("INSERT INTO !!! not sql")
    transform = analyze_sql_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert any(issue.code == errors.PARSE_ERROR for issue in transform.issues)
    assert transform.outputs and transform.outputs[0].kind == "virtual"


def test_bare_select_writes_auto_staging_table(tmp_path):
    pipeline = make_pipeline("SELECT id, amount FROM raw.orders")
    transform = analyze_sql_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert [key.label for key in transform.outputs] == ["analytics.public.p1_b1"]
    assert [key.label for key in transform.inputs] == ["analytics.raw.orders"]
