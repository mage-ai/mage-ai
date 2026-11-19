from __future__ import annotations

import json
from pathlib import Path

from mage_omd_lineage.config import Config
from mage_omd_lineage.emit.emitter import Emitter
from mage_omd_lineage.emit.spool import Spool
from mage_omd_lineage.engine import Engine
from mage_omd_lineage.propagate import build_plan
from mage_omd_lineage.read.repo import RepoReader
from mage_omd_lineage.resolve import Resolver

from fake_omd import DEFAULT_TABLES, FakeOmdClient


def setup_emit(config: Config, demo_project: Path, client: FakeOmdClient, spool_dir: Path):
    reader = RepoReader(demo_project)
    pipeline = reader.load_pipeline("demo_lineage")
    plan = build_plan(pipeline, config, None)
    resolver = Resolver(config, client)
    resolutions = {str(table): resolver.resolve(table) for table in plan.referenced_tables()}
    emitter = Emitter(config, client, Spool(spool_dir))
    fqn, pipeline_id = emitter.ensure_pipeline(
        pipeline, reader.project_uuid, fingerprint="abc"
    )
    return pipeline, plan, resolutions, emitter, fqn, pipeline_id


def test_ensure_pipeline_creates_entity(config, demo_project, tmp_path):
    client = FakeOmdClient()
    pipeline, _, _, _, fqn, pipeline_id = setup_emit(
        config, demo_project, client, tmp_path / "state"
    )

    assert fqn == "mage.demo_project__demo_lineage"
    assert pipeline_id == "pipeline::mage.demo_project__demo_lineage"
    record = client.pipelines[fqn]
    assert record["service"] == "mage"
    assert {task["name"] for task in record["tasks"]} == set(pipeline.blocks)
    assert json.loads(record["extension"]["lineage"])["fingerprint"] == "abc"


def test_ensure_pipeline_updates_existing_with_json_patch(config, demo_project, tmp_path):
    client = FakeOmdClient()
    setup_emit(config, demo_project, client, tmp_path / "state")
    client.pipelines["mage.demo_project__demo_lineage"]["description"] = "old"

    reader = RepoReader(demo_project)
    pipeline = reader.load_pipeline("demo_lineage")
    emitter = Emitter(config, client, Spool(tmp_path / "state"))
    emitter.ensure_pipeline(pipeline, reader.project_uuid, fingerprint="def")

    patch_calls = [call for call in client.calls if call[0] == "patch_pipeline"]
    assert patch_calls
    operations = patch_calls[-1][1]
    assert all({"op", "path", "value"} <= set(operation) for operation in operations)
    assert {operation["path"] for operation in operations} == {
        "/description",
        "/tasks",
        "/extension",
    }
    assert client.pipelines["mage.demo_project__demo_lineage"]["description"] != "old"
    state = json.loads(
        client.pipelines["mage.demo_project__demo_lineage"]["extension"]["lineage"]
    )
    assert state["fingerprint"] == "def"


def test_emit_writes_edges_and_column_lineage(config, demo_project, tmp_path):
    client = FakeOmdClient()
    _, plan, resolutions, emitter, _, pipeline_id = setup_emit(
        config, demo_project, client, tmp_path / "state"
    )
    result = emitter.emit(plan, plan_pipeline(plan), resolutions, pipeline_id)

    assert result.status == "ok"
    assert result.edges_written == 4
    assert result.columns_written == 12
    assert len(client.lineage) == 4

    payload = client.lineage[0]["edge"]
    assert payload["fromEntity"]["type"] == "table"
    assert payload["toEntity"]["type"] == "table"
    assert payload["lineageDetails"]["pipeline"] == {
        "id": pipeline_id,
        "type": "pipeline",
    }
    assert payload["lineageDetails"]["columnsLineage"]
    entry = payload["lineageDetails"]["columnsLineage"][0]
    assert entry["fromColumns"][0].startswith("warehouse_demo.")
    assert entry["toColumn"].startswith("warehouse_demo.")


def test_missing_table_is_partial_and_spooled(config, demo_project, tmp_path):
    tables = dict(DEFAULT_TABLES)
    tables.pop("warehouse_demo.analytics.stg.orders_clean")
    client = FakeOmdClient(tables=tables)
    _, plan, resolutions, emitter, _, pipeline_id = setup_emit(
        config, demo_project, client, tmp_path / "state"
    )
    result = emitter.emit(plan, plan_pipeline(plan), resolutions, pipeline_id)

    assert result.status == "partial"
    assert result.edges_written == 2
    assert result.edges_skipped == 2
    assert result.spooled == 2
    assert result.missing_tables

    spool = Spool(tmp_path / "state")
    records = spool.read_all()
    assert len(records) == 2
    assert {record["reason"] for record in records} == {"missing_in_catalog"}


def test_missing_column_is_reported(config, demo_project, tmp_path):
    tables = dict(DEFAULT_TABLES)
    tables["warehouse_demo.analytics.mart.customer_revenue"] = ["customer_id", "country"]
    client = FakeOmdClient(tables=tables)
    _, plan, resolutions, emitter, _, pipeline_id = setup_emit(
        config, demo_project, client, tmp_path / "state"
    )
    result = emitter.emit(plan, plan_pipeline(plan), resolutions, pipeline_id)

    assert any(issue.code == "column_missing" for issue in result.issues)
    assert result.status == "partial"


def test_time_budget_spools_remaining_edges(config, demo_project, tmp_path):
    client = FakeOmdClient()
    _, plan, resolutions, emitter, _, pipeline_id = setup_emit(
        config, demo_project, client, tmp_path / "state"
    )
    result = emitter.emit(plan, plan_pipeline(plan), resolutions, pipeline_id, deadline=0.0)

    assert result.edges_written == 0
    assert result.spooled == 4
    assert len(client.lineage) == 0


def test_transport_failure_is_spooled(config, demo_project, tmp_path):
    client = FakeOmdClient(fail_lineage=True)
    _, plan, resolutions, emitter, _, pipeline_id = setup_emit(
        config, demo_project, client, tmp_path / "state"
    )
    result = emitter.emit(plan, plan_pipeline(plan), resolutions, pipeline_id)

    assert result.status == "failed"
    assert result.spooled == 4
    assert all(issue.code == "unreachable" for issue in result.issues)


def plan_pipeline(plan):
    """Rebuild a minimal Pipeline view for emitter logging."""
    from mage_omd_lineage.ir import Pipeline

    return Pipeline(uuid=plan.pipeline_uuid, name=plan.pipeline_name, project=plan.project)
