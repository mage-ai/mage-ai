from __future__ import annotations

import json
from pathlib import Path

from mage_omd_lineage import errors
from mage_omd_lineage.analyze.block import analyze_block
from mage_omd_lineage.analyze.catalog import DictCatalog
from mage_omd_lineage.analyze.dbt import analyze_dbt_block
from mage_omd_lineage.config import Config
from mage_omd_lineage.ir import CONFIDENCE_EXACT, CONFIDENCE_TABLE_ONLY, Block, Pipeline

CATALOG = DictCatalog(
    {
        "analytics.stg.orders_clean": ["order_id", "customer_id", "amount"],
        "analytics.raw.customers": ["id", "country"],
    }
)

COMPILED = """
SELECT
    o.customer_id,
    c.country,
    COUNT(*) AS order_count,
    SUM(o.amount) AS revenue
FROM analytics.stg.orders_clean o
JOIN analytics.raw.customers c ON c.id = o.customer_id
GROUP BY o.customer_id, c.country
"""


def manifest(compiled: str | None = COMPILED) -> dict:
    model = {
        "resource_type": "model",
        "name": "customer_revenue_dbt",
        "alias": "customer_revenue_dbt",
        "database": "analytics",
        "schema": "mart",
        "original_file_path": "models/customer_revenue_dbt.sql",
        "config": {"materialized": "table"},
        "depends_on": {
            "nodes": [
                "model.demo_dbt.stg_orders_clean",
                "source.demo.raw.customers",
            ]
        },
    }
    if compiled is not None:
        model["compiled_code"] = compiled
    return {
        "metadata": {"project_name": "demo_dbt"},
        "nodes": {
            "model.demo_dbt.customer_revenue_dbt": model,
            "model.demo_dbt.stg_orders_clean": {
                "resource_type": "model",
                "name": "stg_orders_clean",
                "alias": "orders_clean",
                "database": "analytics",
                "schema": "stg",
                "original_file_path": "models/stg_orders_clean.sql",
                "config": {"materialized": "table"},
                "depends_on": {"nodes": []},
            },
        },
        "sources": {
            "source.demo.raw.customers": {
                "resource_type": "source",
                "name": "customers",
                "identifier": "customers",
                "database": "analytics",
                "schema": "raw",
            }
        },
    }


def write_manifest(tmp_path: Path, data: dict) -> Path:
    path = tmp_path / "dbt_demo" / "target" / "manifest.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def make_config(tmp_path: Path, **block_config) -> Config:
    return Config.from_dict(
        {
            "mage": {"repo_path": "."},
            "profiles": {
                "default": {
                    "service": "warehouse_demo",
                    "driver": "postgres",
                    "database": "analytics",
                    "default_schema": "public",
                }
            },
            "pipelines": {
                "p1": {"enabled": True, "blocks": {"b1": block_config}},
            },
        },
        tmp_path / "omd_lineage.yaml",
    )


def make_pipeline(**configuration) -> Pipeline:
    block = Block(
        uuid="b1",
        name="customer_revenue_dbt",
        type="dbt",
        language="sql",
        code="",
        configuration={
            "data_provider": "postgres",
            "file_path": "models/customer_revenue_dbt.sql",
            **configuration,
        },
    )
    return Pipeline(uuid="p1", name="p1", project="proj", blocks={"b1": block})


def test_dbt_model_from_manifest(tmp_path):
    write_manifest(tmp_path, manifest())
    pipeline = make_pipeline()
    transform = analyze_dbt_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )

    assert [key.label for key in transform.outputs] == [
        "analytics.mart.customer_revenue_dbt"
    ]
    assert {key.label for key in transform.inputs} == {
        "analytics.stg.orders_clean",
        "analytics.raw.customers",
    }
    assert transform.confidence == CONFIDENCE_EXACT

    origins = {
        name: [(origin.table.raw, origin.column) for origin in mapping.origins]
        for name, mapping in transform.columns.items()
    }
    assert origins["customer_id"] == [("analytics.stg.orders_clean", "customer_id")]
    assert origins["country"] == [("analytics.raw.customers", "country")]
    assert origins["revenue"] == [("analytics.stg.orders_clean", "amount")]
    assert transform.columns["revenue"].function == "SUM(o.amount)"


def test_dbt_block_dispatches_from_block_type(tmp_path):
    write_manifest(tmp_path, manifest())
    pipeline = make_pipeline()
    transform = analyze_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert transform is not None
    assert transform.outputs[0].label == "analytics.mart.customer_revenue_dbt"


def test_dbt_manifest_discovered_under_project(tmp_path):
    write_manifest(tmp_path, manifest())
    pipeline = make_pipeline()
    transform = analyze_dbt_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert transform.confidence == CONFIDENCE_EXACT


def test_dbt_without_compiled_code_is_table_only(tmp_path):
    write_manifest(tmp_path, manifest(compiled=None))
    pipeline = make_pipeline()
    transform = analyze_dbt_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )

    assert transform.confidence == CONFIDENCE_TABLE_ONLY
    assert {key.label for key in transform.inputs} == {
        "analytics.stg.orders_clean",
        "analytics.raw.customers",
    }
    assert any(
        "compiled_code" in issue.message for issue in transform.issues
    )


def test_dbt_missing_manifest_reports_issue(tmp_path):
    pipeline = make_pipeline()
    transform = analyze_dbt_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert any(issue.code == errors.UNMODELLED_BLOCK for issue in transform.issues)
    assert transform.outputs[0].kind == "virtual"


def test_dbt_unknown_model_reports_issue(tmp_path):
    write_manifest(tmp_path, manifest())
    pipeline = make_pipeline(dbt_model="not_a_model")
    transform = analyze_dbt_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert any(
        issue.code == errors.UNMODELLED_BLOCK for issue in transform.issues
    )


def test_dbt_ephemeral_model_is_reported(tmp_path):
    data = manifest()
    data["nodes"]["model.demo_dbt.customer_revenue_dbt"]["config"][
        "materialized"
    ] = "ephemeral"
    write_manifest(tmp_path, data)
    pipeline = make_pipeline()
    transform = analyze_dbt_block(
        pipeline.blocks["b1"], pipeline, make_config(tmp_path), CATALOG
    )
    assert any("ephemeral" in issue.message for issue in transform.issues)


def test_dbt_explicit_manifest_path(tmp_path):
    path = tmp_path / "custom" / "manifest.json"
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps(manifest()), encoding="utf-8")
    pipeline = make_pipeline()
    config = make_config(tmp_path, dbt_manifest="custom/manifest.json")
    transform = analyze_dbt_block(pipeline.blocks["b1"], pipeline, config, CATALOG)
    assert transform.outputs[0].label == "analytics.mart.customer_revenue_dbt"
