from __future__ import annotations

from pathlib import Path

from mage_omd_lineage.analyze.catalog import DictCatalog
from mage_omd_lineage.config import Config
from mage_omd_lineage.ir import Block, Pipeline
from mage_omd_lineage.propagate import build_plan
from mage_omd_lineage.read.repo import RepoReader

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


def edge_pairs(plan) -> set[tuple[str, str]]:
    return {(str(edge.from_table), str(edge.to_table)) for edge in plan.edges}


def test_demo_pipeline_edges(config: Config, demo_project: Path):
    reader = RepoReader(demo_project)
    pipeline = reader.load_pipeline("demo_lineage")
    plan = build_plan(pipeline, config, CATALOG)

    assert edge_pairs(plan) == {
        ("analytics.raw.orders", "analytics.stg.orders_clean"),
        ("analytics.raw.customers", "analytics.mart.customer_revenue"),
        ("analytics.stg.orders_clean", "analytics.mart.customer_revenue"),
        ("analytics.mart.customer_revenue", "analytics.mart.customer_revenue_export"),
    }
    assert plan.status == "ok"


def test_intermediate_physical_write_is_kept(config: Config, demo_project: Path):
    pipeline = RepoReader(demo_project).load_pipeline("demo_lineage")
    plan = build_plan(pipeline, config, CATALOG)
    assert (
        "analytics.stg.orders_clean",
        "analytics.mart.customer_revenue",
    ) in edge_pairs(plan)
    assert all(edge.from_table.raw for edge in plan.edges)


def test_column_lineage_across_join(config: Config, demo_project: Path):
    pipeline = RepoReader(demo_project).load_pipeline("demo_lineage")
    plan = build_plan(pipeline, config, CATALOG)
    edge = next(
        edge
        for edge in plan.edges
        if str(edge.from_table) == "analytics.stg.orders_clean"
        and str(edge.to_table) == "analytics.mart.customer_revenue"
    )
    mappings = {(column.from_column, column.to_column) for column in edge.columns}
    assert ("order_id", "order_count") in mappings
    assert ("amount", "revenue") in mappings


def test_virtual_block_chain_is_collapsed(tmp_path: Path):
    config = Config.from_dict(
        {
            "profiles": {
                "default": {
                    "service": "warehouse",
                    "driver": "postgres",
                    "database": "analytics",
                    "default_schema": "public",
                }
            },
            "pipelines": {
                "p1": {
                    "enabled": True,
                    "blocks": {
                        "a": {
                            "contract": {
                                "inputs": ["raw.orders"],
                                "outputs": ["block:a"],
                                "columns": [{"to": "id", "from": ["raw.orders.id"]}],
                            }
                        },
                        "b": {
                            "contract": {
                                "inputs": ["block:a"],
                                "outputs": ["mart.ids"],
                                "columns": [{"to": "id", "from": ["block:a.id"]}],
                            }
                        },
                    },
                }
            },
        },
        tmp_path / "omd_lineage.yaml",
    )
    pipeline = Pipeline(
        uuid="p1",
        name="p1",
        project="proj",
        blocks={
            "a": Block(uuid="a", name="a", type="data_loader", language="python", code=""),
            "b": Block(
                uuid="b",
                name="b",
                type="data_exporter",
                language="python",
                code="",
                upstream=["a"],
            ),
        },
    )
    plan = build_plan(pipeline, config, CATALOG)
    assert edge_pairs(plan) == {("analytics.raw.orders", "analytics.mart.ids")}
    edge = plan.edges[0]
    assert edge.confidence == "contracted"
    assert [(column.from_column, column.to_column) for column in edge.columns] == [
        ("id", "id")
    ]


def test_duplicate_origins_are_deduped(tmp_path: Path):
    config = Config.from_dict(
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
    sql = "INSERT INTO stg.x SELECT COALESCE(amount, amount) AS total FROM raw.orders"
    pipeline = Pipeline(
        uuid="p1",
        name="p1",
        project="proj",
        blocks={
            "b1": Block(
                uuid="b1",
                name="b1",
                type="transformer",
                language="sql",
                code=sql,
                configuration={
                    "data_provider": "postgres",
                    "data_provider_database": "analytics",
                    "data_provider_schema": "stg",
                },
            )
        },
    )
    plan = build_plan(pipeline, config, CATALOG)
    assert len(plan.edges) == 1
    assert len(plan.edges[0].columns) == 1


def test_unmodelled_block_passes_tables_through(tmp_path: Path):
    config = Config.from_dict(
        {
            "profiles": {
                "default": {
                    "service": "warehouse",
                    "driver": "postgres",
                    "database": "analytics",
                    "default_schema": "public",
                }
            },
            "pipelines": {
                "p1": {
                    "enabled": True,
                    "blocks": {
                        "c": {
                            "contract": {
                                "inputs": ["block:b"],
                                "outputs": ["mart.y"],
                            }
                        }
                    },
                }
            },
        },
        tmp_path / "omd_lineage.yaml",
    )
    pipeline = Pipeline(
        uuid="p1",
        name="p1",
        project="proj",
        blocks={
            "a": Block(
                uuid="a",
                name="a",
                type="transformer",
                language="sql",
                code="INSERT INTO stg.x SELECT id FROM raw.orders",
                configuration={
                    "data_provider": "postgres",
                    "data_provider_database": "analytics",
                    "data_provider_schema": "stg",
                },
            ),
            "b": Block(uuid="b", name="b", type="transformer", language="python", code=""),
            "c": Block(uuid="c", name="c", type="data_exporter", language="python", code=""),
        },
    )
    pipeline.blocks["b"].upstream = ["a"]
    pipeline.blocks["c"].upstream = ["b"]
    plan = build_plan(pipeline, config, CATALOG)
    assert edge_pairs(plan) == {
        ("analytics.raw.orders", "analytics.stg.x"),
        ("analytics.stg.x", "analytics.mart.y"),
    }
    assert any(issue.code == "unmodelled_block" for issue in plan.issues)
