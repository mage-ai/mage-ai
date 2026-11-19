from __future__ import annotations

import shutil
from pathlib import Path

import mage_omd_lineage.adapters.mage_block as adapter  # noqa: F401
from mage_omd_lineage.adapters import lineage_emit
from mage_omd_lineage.config import Config
from mage_omd_lineage.engine import Engine


def test_lineage_emit_never_raises_without_context():
    assert lineage_emit() is None


def test_lineage_emit_never_raises_with_missing_config(tmp_path):
    assert lineage_emit(pipeline_uuid="demo_lineage", repo_path=str(tmp_path)) is None


def test_lineage_emit_is_importable_from_package_root():
    import mage_omd_lineage

    assert mage_omd_lineage.lineage_emit is lineage_emit


def _prepare(demo_source: Path, tmp_path: Path, monkeypatch, **changes) -> tuple[Path, list]:
    project = tmp_path / "demo"
    shutil.copytree(demo_source, project)
    config = Config.load(project / "omd_lineage.yaml")
    pipeline_config = config.pipelines["demo_lineage"]
    for key, value in changes.items():
        setattr(pipeline_config, key, value)

    monkeypatch.setattr(Config, "load", classmethod(lambda cls, path: config))
    monkeypatch.setattr(
        "mage_omd_lineage.engine.build_client", lambda config: object()
    )

    calls: list = []
    monkeypatch.setattr(Engine, "run", lambda self, *args, **kwargs: calls.append(args))
    return project, calls


def test_disabled_pipeline_is_skipped(demo_source, tmp_path, monkeypatch):
    project, calls = _prepare(demo_source, tmp_path, monkeypatch, enabled=False)

    assert lineage_emit(pipeline_uuid="demo_lineage", repo_path=str(project)) is None
    assert calls == []


def test_manual_only_pipeline_is_skipped(demo_source, tmp_path, monkeypatch):
    project, calls = _prepare(demo_source, tmp_path, monkeypatch)
    # Rebuild with a manual-only trigger.
    calls.clear()
    config = Config.load(project / "omd_lineage.yaml")
    config.pipelines["demo_lineage"].trigger.modes = ["manual"]
    monkeypatch.setattr(Config, "load", classmethod(lambda cls, path: config))

    assert lineage_emit(pipeline_uuid="demo_lineage", repo_path=str(project)) is None
    assert calls == []
