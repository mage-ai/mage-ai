from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from mage_ai.services.openmetadata import lineage
from mage_ai.services.openmetadata.lineage import service
from mage_ai.services.openmetadata.lineage.config import Config
from mage_ai.services.openmetadata.lineage.engine import Engine


def _pipeline(repo_path: Path) -> SimpleNamespace:
    return SimpleNamespace(uuid='demo_lineage', repo_path=str(repo_path))


def _enable(monkeypatch, enabled: bool = True) -> None:
    monkeypatch.setattr(service, 'ENABLE_OPENMETADATA', enabled)


def _prepare(demo_source: Path, tmp_path: Path, monkeypatch, **changes):
    import shutil

    project = tmp_path / 'demo'
    shutil.copytree(demo_source, project)
    config = Config.load(project / 'omd_lineage.yaml')
    for key, value in changes.items():
        setattr(config.pipelines['demo_lineage'], key, value)

    monkeypatch.setattr(Config, 'load', classmethod(lambda cls, path: config))
    monkeypatch.setattr(
        'mage_ai.services.openmetadata.lineage.engine.build_client',
        lambda config: object(),
    )

    calls: list = []

    def fake_run(self, *args, **kwargs):
        calls.append(args)
        return SimpleNamespace(
            pipeline_uuid='demo_lineage',
            status='ok',
            emit=SimpleNamespace(edges_written=4, spooled=0),
        )

    monkeypatch.setattr(Engine, 'run', fake_run)
    return project, config, calls


def test_emit_is_disabled_by_default(monkeypatch):
    _enable(monkeypatch, False)
    service.emit_pipeline_lineage(_pipeline(Path('/tmp')))


def test_emit_never_raises_without_config(tmp_path, monkeypatch):
    _enable(monkeypatch)
    service.emit_pipeline_lineage(_pipeline(tmp_path))


def test_disabled_pipeline_is_skipped(demo_source, tmp_path, monkeypatch):
    _enable(monkeypatch)
    project, _, calls = _prepare(demo_source, tmp_path, monkeypatch, enabled=False)

    service.emit_pipeline_lineage(_pipeline(project))

    assert calls == []


def test_manual_only_pipeline_is_skipped(demo_source, tmp_path, monkeypatch):
    _enable(monkeypatch)
    project, config, calls = _prepare(demo_source, tmp_path, monkeypatch)
    config.pipelines['demo_lineage'].trigger.modes = ['manual']

    service.emit_pipeline_lineage(_pipeline(project))

    assert calls == []


def test_enabled_pipeline_emits(demo_source, tmp_path, monkeypatch):
    _enable(monkeypatch)
    project, _, calls = _prepare(demo_source, tmp_path, monkeypatch)

    service.emit_pipeline_lineage(_pipeline(project))

    assert calls == [('demo_lineage',)]


def test_engine_failure_is_swallowed(demo_source, tmp_path, monkeypatch):
    _enable(monkeypatch)
    project, _, _ = _prepare(demo_source, tmp_path, monkeypatch)

    def explode(self, *args, **kwargs):
        raise RuntimeError('OpenMetadata is down')

    monkeypatch.setattr(Engine, 'run', explode)

    service.emit_pipeline_lineage(_pipeline(project))


def test_initialize_returns_flag(monkeypatch):
    _enable(monkeypatch, True)
    assert service.initialize_openmetadata() is True
    _enable(monkeypatch, False)
    assert service.initialize_openmetadata() is False


def test_lineage_package_has_version():
    assert lineage.__version__
