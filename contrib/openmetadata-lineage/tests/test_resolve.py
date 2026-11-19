from __future__ import annotations

from pathlib import Path

from mage_omd_lineage.config import Config
from mage_omd_lineage.ir import TableRef
from mage_omd_lineage.resolve import Resolver

from fake_omd import FakeOmdClient


def make_config(tmp_path: Path, **profile) -> Config:
    data = {
        "profiles": {
            "default": {
                "service": "warehouse_demo",
                "driver": "postgres",
                "database": "analytics",
                "default_schema": "public",
                "case": "lower",
            }
        },
        "pipelines": {"p1": {"enabled": True}},
    }
    data["profiles"]["default"].update(profile)
    return Config.from_dict(data, tmp_path / "omd_lineage.yaml")


def table(raw: str, database: str | None = None, schema: str | None = None) -> TableRef:
    return TableRef(profile="default", database=database, schema=schema, table=raw)


def test_resolves_exact_table(tmp_path):
    config = make_config(tmp_path)
    client = FakeOmdClient()
    resolver = Resolver(config, client)
    resolution = resolver.resolve(table("orders", database="analytics", schema="raw"))
    assert resolution.status == "resolved"
    assert resolution.resolved.fqn == "warehouse_demo.analytics.raw.orders"
    assert "amount" in resolution.resolved.columns


def test_candidate_order_follows_case_setting(tmp_path):
    config = make_config(tmp_path, case="upper")
    client = FakeOmdClient(
        tables={"warehouse_demo.ANALYTICS.RAW.ORDERS": ["id"]},
    )
    resolver = Resolver(config, client)
    resolution = resolver.resolve(table("ORDERS", database="ANALYTICS", schema="RAW"))
    assert resolution.status == "resolved"
    assert resolution.resolved.fqn == "warehouse_demo.ANALYTICS.RAW.ORDERS"


def test_missing_table_reports_remediation(tmp_path):
    config = make_config(tmp_path)
    client = FakeOmdClient()
    resolver = Resolver(config, client)
    resolution = resolver.resolve(table("absent", database="analytics", schema="raw"))
    assert resolution.status == "missing"
    assert "run metadata ingestion" in (resolution.message or "")
    assert resolution.candidates


def test_ambiguous_reference(tmp_path):
    config = make_config(tmp_path)
    client = FakeOmdClient(
        tables={
            "warehouse_demo.analytics.raw.orders": ["id"],
            "warehouse_demo.ANALYTICS.RAW.ORDERS": ["id"],
        }
    )
    resolver = Resolver(config, client)
    resolution = resolver.resolve(table("orders", database="analytics", schema="raw"))
    assert resolution.status == "ambiguous"
    assert len(resolution.candidates) == 2


def test_unknown_service(tmp_path):
    config = make_config(tmp_path)
    client = FakeOmdClient(tables={"warehouse_demo.analytics.raw.orders": ["id"]}, services={})
    resolver = Resolver(config, client)
    resolution = resolver.resolve(table("orders", database="analytics", schema="raw"))
    assert resolution.status == "missing"
    assert "was not found" in (resolution.message or "")


def test_missing_schema_is_reported(tmp_path):
    config = make_config(tmp_path, default_schema=None)
    resolver = Resolver(config, FakeOmdClient())
    resolution = resolver.resolve(table("orders", database="analytics"))
    assert resolution.status == "unresolved"
    assert "schema" in (resolution.message or "")


def test_registry_override(tmp_path):
    config = Config.from_dict(
        {
            "profiles": {
                "default": {
                    "service": "warehouse_demo",
                    "driver": "postgres",
                    "database": "analytics",
                    "default_schema": "public",
                }
            },
            "pipelines": {"p1": {"enabled": True}},
            "dataset_registry": {"analytics.raw.orders": "warehouse_demo.custom.orders_v2"},
        },
        tmp_path / "omd_lineage.yaml",
    )
    client = FakeOmdClient(tables={"warehouse_demo.custom.orders_v2": ["id"]})
    resolver = Resolver(config, client)
    resolution = resolver.resolve(table("orders", database="analytics", schema="raw"))
    assert resolution.status == "resolved"
    assert resolution.resolved.fqn == "warehouse_demo.custom.orders_v2"


def test_offline_mode_does_not_call_omd(tmp_path):
    config = make_config(tmp_path)
    client = FakeOmdClient()
    resolver = Resolver(config, client, offline=True)
    resolution = resolver.resolve(table("orders", database="analytics", schema="raw"))
    assert resolution.status == "offline"
    assert client.calls == []


def test_custom_fqn_template(tmp_path):
    config = make_config(tmp_path, fqn="{service}.{schema}.{table}")
    client = FakeOmdClient(tables={"warehouse_demo.raw.orders": ["id"]})
    resolver = Resolver(config, client)
    resolution = resolver.resolve(table("orders", database="analytics", schema="raw"))
    assert resolution.status == "resolved"
    assert resolution.resolved.fqn == "warehouse_demo.raw.orders"


def test_columns_returns_none_when_unresolved(tmp_path):
    config = make_config(tmp_path)
    resolver = Resolver(config, FakeOmdClient())
    assert resolver.columns(table("absent", database="analytics", schema="raw")) is None
