from __future__ import annotations

import json

from mage_ai.services.openmetadata.lineage.config import Config
from mage_ai.services.openmetadata.lineage.engine import Engine
from mage_ai.services.openmetadata.lineage.ir import STATUS_PARTIAL, STATUS_UNSUPPORTED

from mage_ai.tests.services.openmetadata.fake_omd import DEFAULT_TABLES, FakeOmdClient


def test_offline_plan_builds_edges(config, demo_project):
    engine = Engine(config, client=None, offline=True)
    outcome = engine.run("demo_lineage", apply=False)
    assert outcome.status == "ok"
    assert len(outcome.plan.edges) == 4
    assert outcome.emit is None


def test_gate_skips_unsupported_platform(config, demo_project):
    engine = Engine(config, client=None, offline=True)
    outcome = engine.run("duckdb_demo", apply=False)
    assert outcome.status == STATUS_UNSUPPORTED
    assert outcome.plan is None
    assert "duckdb" in (outcome.skipped_reason or "")
    assert outcome.issues[0].code == "unsupported_platform"


def test_apply_writes_lineage_and_coverage(config, demo_project):
    client = FakeOmdClient()
    engine = Engine(config, client=client)
    outcome = engine.run("demo_lineage", apply=True)

    assert outcome.status == "ok"
    assert outcome.emit.edges_written == 4
    assert len(client.lineage) == 4
    assert "mage.demo_project__demo_lineage" in client.pipelines

    report = engine.report_path
    assert report.exists()
    payload = json.loads(report.read_text())
    assert payload["pipeline"]["wired_tables"] == 5
    assert payload["pipeline"]["missing_in_catalog"] == []
    assert payload["pipeline"]["column_coverage"] == 1.0


def test_partial_apply_spools_and_reports(tmp_path, demo_project):
    config = Config.load(demo_project / "omd_lineage.yaml")
    tables = dict(DEFAULT_TABLES)
    tables.pop("warehouse_demo.analytics.mart.customer_revenue_export")
    client = FakeOmdClient(tables=tables)
    engine = Engine(config, client=client)
    outcome = engine.run("demo_lineage", apply=True)

    assert outcome.status == STATUS_PARTIAL
    assert outcome.coverage.missing
    assert outcome.emit.spooled == 1
    assert engine.spool.count() == 1


def test_all_or_nothing_publishes_nothing_when_a_table_is_missing(demo_project):
    config = Config.load(demo_project / "omd_lineage.yaml")
    config.openmetadata.coverage.emit = "all_or_nothing"
    tables = dict(DEFAULT_TABLES)
    tables.pop("warehouse_demo.analytics.mart.customer_revenue_export")
    client = FakeOmdClient(tables=tables)
    engine = Engine(config, client=client)
    outcome = engine.run("demo_lineage", apply=True)

    assert outcome.status == STATUS_PARTIAL
    assert outcome.emit.edges_written == 0
    assert client.lineage == []
    assert outcome.emit.missing_tables


def test_second_run_is_unchanged_when_fingerprint_matches(config, demo_project):
    client = FakeOmdClient()
    engine = Engine(config, client=client)
    first = engine.run("demo_lineage", apply=True)
    assert first.emit.unchanged is False

    second = engine.run("demo_lineage", apply=True)
    assert second.emit.unchanged is True
    assert second.emit.edges_written == 0
    assert len(client.lineage) == 4


def test_force_ignores_fingerprint(config, demo_project):
    client = FakeOmdClient()
    engine = Engine(config, client=client)
    engine.run("demo_lineage", apply=True)
    forced = engine.run("demo_lineage", apply=True, force=True)
    assert forced.emit.unchanged is False
    assert forced.emit.edges_written == 4
    assert len(client.lineage) == 8


def test_only_missing_retries_spooled_edges(config, demo_project):
    tables = dict(DEFAULT_TABLES)
    tables.pop("warehouse_demo.analytics.mart.customer_revenue_export")
    client = FakeOmdClient(tables=tables)
    engine = Engine(config, client=client)
    engine.run("demo_lineage", apply=True)
    assert engine.spool.count() == 1

    # The table appears in the catalog: the spooled edge can now be published.
    client.tables["warehouse_demo.analytics.mart.customer_revenue_export"] = {
        "id": "id::export",
        "fullyQualifiedName": "warehouse_demo.analytics.mart.customer_revenue_export",
        "columns": [
            {"name": "customer_id"},
            {"name": "country"},
            {"name": "order_count"},
            {"name": "revenue"},
        ],
    }
    retry = engine.run("demo_lineage", apply=True, only_missing=True, force=True)
    assert retry.emit.edges_written == 1
