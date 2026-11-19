"""Read a Mage project from a local checkout.

The reader is deliberately dependency free: it reads ``pipelines/<uuid>/metadata.yaml``
plus the block files, which is the same source Mage uses to execute the pipeline.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from ..errors import ConfigError
from ..ir import Block, Pipeline

BLOCK_FOLDERS = (
    "data_loaders",
    "transformers",
    "data_exporters",
    "custom",
    "dbt",
    "sensors",
    "callbacks",
    "conditionals",
    "extensions",
    "charts",
    "scratchpads",
    "global_data_products",
)

CODE_SUFFIXES = (".sql", ".py", ".r", ".yaml", ".yml")


class RepoReader:
    def __init__(self, root: str | Path):
        self.root = self._detect_project_root(Path(root).expanduser().resolve())

    @staticmethod
    def _detect_project_root(candidate: Path) -> Path:
        if (candidate / "pipelines").is_dir() and (candidate / "metadata.yaml").exists():
            return candidate
        if candidate.is_dir():
            children = [
                child
                for child in candidate.iterdir()
                if child.is_dir()
                and (child / "pipelines").is_dir()
                and (child / "metadata.yaml").exists()
            ]
            if len(children) == 1:
                return children[0]
        raise ConfigError(
            f"Mage project not found at {candidate}: expected pipelines/ and metadata.yaml"
        )

    # -- project ---------------------------------------------------------
    @property
    def project_metadata(self) -> dict[str, Any]:
        path = self.root / "metadata.yaml"
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}

    @property
    def project_uuid(self) -> str:
        data = self.project_metadata
        return str(data.get("project_uuid") or self.root.name)

    def list_pipeline_uuids(self) -> list[str]:
        pipelines_dir = self.root / "pipelines"
        return sorted(
            child.name
            for child in pipelines_dir.iterdir()
            if child.is_dir() and (child / "metadata.yaml").exists()
        )

    # -- pipelines -------------------------------------------------------
    def load_pipeline(self, uuid: str) -> Pipeline:
        pipeline_dir = self.root / "pipelines" / uuid
        metadata_path = pipeline_dir / "metadata.yaml"
        if not metadata_path.exists():
            raise ConfigError(f"Pipeline '{uuid}' not found under {pipeline_dir}")
        raw = yaml.safe_load(metadata_path.read_text(encoding="utf-8")) or {}

        blocks: dict[str, Block] = {}
        for entry in raw.get("blocks") or []:
            block = self._load_block(entry, pipeline_uuid=uuid)
            blocks[block.uuid] = block

        # Pipeline-level callbacks are blocks too (Pro), but they never produce data.
        for entry in raw.get("callbacks") or []:
            block = self._load_block(entry, pipeline_uuid=uuid, forced_type="callback")
            blocks.setdefault(block.uuid, block)

        return Pipeline(
            uuid=str(raw.get("uuid") or uuid),
            name=str(raw.get("name") or uuid),
            project=self.project_uuid,
            blocks=blocks,
            raw=raw,
            source_path=str(metadata_path),
        )

    def load_all(self) -> list[Pipeline]:
        return [self.load_pipeline(uuid) for uuid in self.list_pipeline_uuids()]

    def _load_block(
        self,
        entry: dict[str, Any],
        pipeline_uuid: str,
        forced_type: str | None = None,
    ) -> Block:
        block_uuid = str(entry.get("uuid") or entry.get("name") or "")
        if not block_uuid:
            raise ConfigError(f"Block without uuid in pipeline '{pipeline_uuid}'")

        code, source_path, suffix = self._find_block_source(block_uuid)
        block_type = forced_type or str(entry.get("type") or "custom")
        language = str(entry.get("language") or ("sql" if suffix == ".sql" else "python"))
        return Block(
            uuid=block_uuid,
            name=str(entry.get("name") or block_uuid),
            type=block_type,
            language=language,
            code=code,
            upstream=[str(item) for item in entry.get("upstream_blocks") or []],
            downstream=[str(item) for item in entry.get("downstream_blocks") or []],
            configuration=dict(entry.get("configuration") or {}),
            source_path=str(source_path) if source_path else None,
        )

    def _find_block_source(self, block_uuid: str) -> tuple[str, Path | None, str]:
        for folder in BLOCK_FOLDERS:
            directory = self.root / folder
            if not directory.is_dir():
                continue
            for suffix in CODE_SUFFIXES:
                candidate = directory / f"{block_uuid}{suffix}"
                if candidate.exists():
                    return candidate.read_text(encoding="utf-8"), candidate, suffix
            # Blocks may be nested one level (e.g. reused sub-blocks).
            for candidate in directory.glob(f"*/{block_uuid}.*"):
                if candidate.suffix in CODE_SUFFIXES:
                    return candidate.read_text(encoding="utf-8"), candidate, candidate.suffix
        return "", None, ""
