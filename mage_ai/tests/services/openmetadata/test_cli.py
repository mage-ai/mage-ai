from __future__ import annotations

import json

import pytest

from mage_ai.services.openmetadata.lineage import cli
from mage_ai.services.openmetadata.lineage.emit.spool import Spool

from mage_ai.tests.services.openmetadata.fake_omd import DEFAULT_TABLES, FakeOmdClient


@pytest.fixture
def fake_client(monkeypatch):
    client = FakeOmdClient()
    monkeypatch.setattr(cli, "build_client", lambda config: client)
    return client


def test_plan_offline_exit_zero(demo_project):
    code = cli.main(
        [
            "plan",
            "--project",
            str(demo_project),
            "--pipeline",
            "demo_lineage",
            "--offline",
        ]
    )
    assert code == 0


def test_plan_all_returns_unsupported_exit(demo_project):
    code = cli.main(["plan", "--project", str(demo_project), "--all", "--offline"])
    assert code == 3


def test_apply_requires_confirmation(demo_project):
    code = cli.main(
        ["apply", "--project", str(demo_project), "--pipeline", "demo_lineage"]
    )
    assert code == 2


def test_apply_writes_lineage(demo_project, fake_client):
    code = cli.main(
        [
            "apply",
            "--project",
            str(demo_project),
            "--pipeline",
            "demo_lineage",
            "--yes",
            "--non-interactive",
        ]
    )
    assert code == 0
    assert len(fake_client.lineage) == 4
    report = demo_project / "mage_data/demo_project/omd_lineage/coverage.json"
    assert report.exists()


def test_apply_missing_table_returns_partial(demo_project, monkeypatch):
    tables = dict(DEFAULT_TABLES)
    tables.pop("warehouse_demo.analytics.mart.customer_revenue_export")
    client = FakeOmdClient(tables=tables)
    monkeypatch.setattr(cli, "build_client", lambda config: client)

    code = cli.main(
        [
            "apply",
            "--project",
            str(demo_project),
            "--pipeline",
            "demo_lineage",
            "--yes",
            "--non-interactive",
        ]
    )
    assert code == 1


def test_apply_auth_failure_is_fatal(demo_project, monkeypatch):
    client = FakeOmdClient(fail_auth=True)
    monkeypatch.setattr(cli, "build_client", lambda config: client)

    code = cli.main(
        [
            "apply",
            "--project",
            str(demo_project),
            "--pipeline",
            "demo_lineage",
            "--yes",
            "--non-interactive",
        ]
    )
    assert code == 2


def test_apply_transport_failure_is_fatal(demo_project, monkeypatch):
    client = FakeOmdClient(fail_lineage=True)
    monkeypatch.setattr(cli, "build_client", lambda config: client)

    code = cli.main(
        [
            "apply",
            "--project",
            str(demo_project),
            "--pipeline",
            "demo_lineage",
            "--yes",
            "--non-interactive",
        ]
    )
    assert code == 2


def test_coverage_command_reports_without_writing(demo_project, fake_client):
    code = cli.main(
        ["coverage", "--project", str(demo_project), "--pipeline", "demo_lineage"]
    )
    assert code == 0
    assert fake_client.lineage == []


def test_apply_due_skips_fresh_pipeline(demo_project, fake_client, capsys):
    base = [
        "apply",
        "--project",
        str(demo_project),
        "--pipeline",
        "demo_lineage",
        "--yes",
        "--non-interactive",
    ]
    assert cli.main(base) == 0
    capsys.readouterr()

    assert cli.main(base + ["--due"]) == 0
    assert "nothing due" in capsys.readouterr().out


def test_fingerprint_is_json(demo_project, capsys):
    code = cli.main(
        [
            "fingerprint",
            "--project",
            str(demo_project),
            "--pipeline",
            "demo_lineage",
            "--offline",
        ]
    )
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert len(payload["demo_lineage"]) == 64


def test_spool_show_and_clear(demo_project, fake_client, capsys):
    spool = Spool(demo_project / "mage_data/demo_project/omd_lineage")
    spool.append({"from_table": "a", "to_table": "b"})

    code = cli.main(["spool", "show", "--project", str(demo_project)])
    assert code == 0
    records = json.loads(capsys.readouterr().out)
    assert records[0]["from_table"] == "a"

    code = cli.main(["spool", "clear", "--project", str(demo_project)])
    assert code == 0
    assert spool.count() == 0


def test_duration_parsing():
    assert cli._duration_seconds("30m") == 1800
    assert cli._duration_seconds("6h") == 21600
    assert cli._duration_seconds("7d") == 604800
    with pytest.raises(Exception):
        cli._duration_seconds("soon")


def test_parse_timestamp():
    assert cli._parse_timestamp(None) is None
    assert cli._parse_timestamp("not-a-date") is None
    assert cli._parse_timestamp("2024-01-01T00:00:00Z") is not None


def test_platforms_output(capsys):
    code = cli.main(["platforms", "--format", "json"])
    assert code == 0
    rows = json.loads(capsys.readouterr().out)
    assert any(row["driver"] == "postgres" and row["state"] == "supported" for row in rows)
    assert any(row["driver"] == "duckdb" and row["state"] == "unsupported" for row in rows)
