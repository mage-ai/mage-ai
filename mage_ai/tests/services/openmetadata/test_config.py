from __future__ import annotations

from pathlib import Path

import pytest

from mage_ai.services.openmetadata.lineage.config import Config
from mage_ai.services.openmetadata.lineage.errors import ConfigError


def _base(**overrides):
    data = {
        "openmetadata": {"host": "http://localhost:8586", "token": "t"},
        "profiles": {
            "default": {
                "service": "warehouse",
                "driver": "postgres",
                "database": "analytics",
                "default_schema": "public",
            }
        },
        "pipelines": {"p1": {"enabled": True}},
    }
    data.update(overrides)
    return data


def test_env_interpolation_with_default(tmp_path, monkeypatch):
    monkeypatch.delenv("OMD_HOST_TEST", raising=False)
    data = _base(openmetadata={"host": "${OMD_HOST_TEST:-http://fallback:8586}", "token": "t"})
    config = Config.from_dict(data, tmp_path / "omd_lineage.yaml")
    assert config.openmetadata.host == "http://fallback:8586"


def test_env_interpolation_missing_raises(tmp_path, monkeypatch):
    monkeypatch.delenv("OMD_TOKEN_MISSING", raising=False)
    data = _base(openmetadata={"host": "h", "token": "${OMD_TOKEN_MISSING}"})
    with pytest.raises(ConfigError):
        Config.from_dict(data, tmp_path / "omd_lineage.yaml")


def test_invalid_trigger_mode(tmp_path):
    data = _base(pipelines={"p1": {"enabled": True, "trigger": {"modes": ["always"]}}})
    with pytest.raises(ConfigError):
        Config.from_dict(data, tmp_path / "omd_lineage.yaml")


def test_contract_and_override_conflict(tmp_path):
    data = _base(
        pipelines={
            "p1": {
                "enabled": True,
                "blocks": {"b1": {"contract": {"outputs": []}, "sql_override": "SELECT 1"}},
            }
        }
    )
    with pytest.raises(ConfigError):
        Config.from_dict(data, tmp_path / "omd_lineage.yaml")


def test_enabled_pipelines(tmp_path):
    data = _base(
        pipelines={
            "p1": {"enabled": True},
            "p2": {"enabled": False},
        }
    )
    config = Config.from_dict(data, tmp_path / "omd_lineage.yaml")
    assert [pipeline.uuid for pipeline in config.enabled_pipelines()] == ["p1"]
    assert config.pipeline("p2").enabled is False


def test_profile_fallback_to_default(tmp_path):
    data = _base()
    config = Config.from_dict(data, tmp_path / "omd_lineage.yaml")
    profile = config.profile("unknown")
    assert profile.name == "default"
    assert profile.service == "warehouse"


def test_missing_profile_raises(tmp_path):
    data = {"profiles": {}, "pipelines": {}}
    config = Config.from_dict(data, tmp_path / "omd_lineage.yaml")
    with pytest.raises(ConfigError):
        config.profile("anything")


def test_report_path_relative_to_config(tmp_path):
    data = _base(
        openmetadata={
            "host": "h",
            "token": "t",
            "coverage": {"report_path": "mage_data/x.json"},
        }
    )
    config = Config.from_dict(data, tmp_path / "omd_lineage.yaml")
    assert config.report_path(Path("/tmp/default")) == tmp_path / "mage_data/x.json"


def test_demo_config_loads(config):
    assert config.openmetadata.pipeline_service == "mage"
    assert config.pipeline("demo_lineage").enabled is True
    assert config.pipeline("demo_lineage").trigger.schedule.every == "6h"
    assert config.profile("duck").driver == "duckdb"
