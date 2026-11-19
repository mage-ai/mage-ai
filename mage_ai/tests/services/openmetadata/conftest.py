from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from mage_ai.services.openmetadata.lineage.config import Config

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def demo_source() -> Path:
    return FIXTURES / "demo_project"


@pytest.fixture
def demo_project(tmp_path: Path, demo_source: Path) -> Path:
    """A writable copy of the demo project, so runs do not pollute the repo."""
    destination = tmp_path / "demo_project"
    shutil.copytree(demo_source, destination)
    return destination


@pytest.fixture
def config(demo_project: Path) -> Config:
    return Config.load(demo_project / "omd_lineage.yaml")
