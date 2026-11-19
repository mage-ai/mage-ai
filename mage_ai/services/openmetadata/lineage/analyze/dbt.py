"""dbt lineage from ``manifest.json``.

dbt blocks are opaque to the SQL analyser: the block runs a model, the model's
compiled SQL and physical target live in the project's dbt manifest. This analyser
reads the manifest, selects the block's model, and reuses the SQL analyser on the
compiled statement with the model's real target table.

Manifest resolution order:

1. ``blocks.<uuid>.dbt_manifest`` in ``omd_lineage.yaml``
2. ``dbt_manifest`` / ``manifest_path`` in the block configuration
3. ``<dbt_project_path>/target/manifest.json`` (or ``<dbt_project_name>``)
4. the first ``**/target/manifest.json`` under the Mage project
"""

from __future__ import annotations

import json
import os
from itertools import islice
from pathlib import Path
from typing import Any

from .. import errors
from ..config import BlockConfig, Config, ProfileConfig
from ..ir import (
    CONFIDENCE_TABLE_ONLY,
    Block,
    BlockTransform,
    DatasetKey,
    Pipeline,
    TableRef,
)
from .catalog import ColumnCatalog
from .sql import analyze_sql_block

_MANIFEST_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}


def analyze_dbt_block(
    block: Block,
    pipeline: Pipeline,
    config: Config,
    catalog: ColumnCatalog,
) -> BlockTransform:
    block_config = config.pipeline(pipeline.uuid).block(block.uuid)
    manifest_path = _manifest_path(block, block_config, config)
    if manifest_path is None:
        return _unmodelled(
            block,
            pipeline,
            [
                _issue(
                    block,
                    pipeline,
                    errors.UNMODELLED_BLOCK,
                    "No dbt manifest.json found; run 'dbt compile' and set "
                    "blocks.<uuid>.dbt_manifest or dbt_project_path",
                )
            ],
        )

    try:
        manifest = _load_manifest(manifest_path)
    except (OSError, json.JSONDecodeError) as exc:
        return _unmodelled(
            block,
            pipeline,
            [
                _issue(
                    block,
                    pipeline,
                    errors.UNMODELLED_BLOCK,
                    f"dbt manifest could not be read: {exc}",
                )
            ],
        )

    node, unique_id, candidates = _select_node(manifest, block, block_config)
    if node is None:
        detail = f" (candidates: {', '.join(candidates)})" if candidates else ""
        return _unmodelled(
            block,
            pipeline,
            [
                _issue(
                    block,
                    pipeline,
                    errors.UNMODELLED_BLOCK,
                    "dbt model not identified in the manifest; set "
                    f"blocks.<uuid>.dbt_model{detail}",
                )
            ],
        )

    profile_name = block.profile or "default"
    profile = config.profile(profile_name)

    materialized = str((node.get("config") or {}).get("materialized") or "view").lower()
    target = _node_table(node, profile_name, profile)
    if materialized == "ephemeral" or target is None:
        return _unmodelled(
            block,
            pipeline,
            [
                _issue(
                    block,
                    pipeline,
                    errors.UNMODELLED_BLOCK,
                    f"dbt model '{unique_id}' is ephemeral and has no physical table",
                )
            ],
        )

    issues: list[Any] = []
    dependencies = _dependency_tables(node, manifest, profile_name, profile)

    compiled = node.get("compiled_code") or node.get("compiled_sql")
    if compiled:
        transform = analyze_sql_block(
            block,
            pipeline,
            config,
            catalog,
            sql_override=str(compiled),
            target_override=target,
        )
        transform.issues = list(transform.issues) + issues
    else:
        transform = BlockTransform(
            block_uuid=block.uuid,
            inputs=[DatasetKey.for_table(table) for table in dependencies],
            outputs=[DatasetKey.for_table(target)],
            columns={},
            confidence=CONFIDENCE_TABLE_ONLY,
            issues=issues
            + [
                _issue(
                    block,
                    pipeline,
                    errors.UNMODELLED_BLOCK,
                    "dbt manifest has no compiled_code; run 'dbt compile' for column lineage",
                )
            ],
        )

    # The model's physical target is authoritative, and manifest dependencies must
    # always appear as inputs even when the compiled SQL hides them (macros, ephemeral).
    transform.outputs = [DatasetKey.for_table(target)]
    known = {
        str(key.table)
        for key in transform.inputs
        if key.kind == "table" and key.table is not None
    }
    for table in dependencies:
        if str(table) == str(target) or str(table) in known:
            continue
        transform.inputs.append(DatasetKey.for_table(table))
        known.add(str(table))
    return transform


# ---------------------------------------------------------------------------
# manifest helpers
# ---------------------------------------------------------------------------


def _manifest_path(
    block: Block, block_config: BlockConfig, config: Config
) -> Path | None:
    raw = block.configuration
    for value in (
        block_config.dbt_manifest,
        raw.get("dbt_manifest"),
        raw.get("manifest_path"),
    ):
        if value:
            candidate = Path(str(value)).expanduser()
            if not candidate.is_absolute():
                candidate = config.repo_path / candidate
            if candidate.exists():
                return candidate

    project = raw.get("dbt_project_path") or raw.get("dbt_project_name")
    if project:
        base = Path(str(project)).expanduser()
        if not base.is_absolute():
            base = config.repo_path / base
        for candidate in (base / "target" / "manifest.json", base / "manifest.json"):
            if candidate.exists():
                return candidate

    project_name = raw.get("dbt_project_name")
    matches: list[Path] = []
    for candidate in islice(config.repo_path.glob("**/target/manifest.json"), 50):
        parts = set(candidate.parts)
        if ".git" in parts or "node_modules" in parts:
            continue
        matches.append(candidate)
    if not matches:
        return None
    if project_name:
        for candidate in matches:
            try:
                manifest = _load_manifest(candidate)
            except (OSError, json.JSONDecodeError):
                continue
            if str((manifest.get("metadata") or {}).get("project_name")) == str(
                project_name
            ):
                return candidate
    return matches[0]


def _load_manifest(path: Path) -> dict[str, Any]:
    key = str(path)
    mtime = os.path.getmtime(path)
    cached = _MANIFEST_CACHE.get(key)
    if cached is not None and cached[0] == mtime:
        return cached[1]
    data = json.loads(path.read_text(encoding="utf-8"))
    _MANIFEST_CACHE[key] = (mtime, data)
    return data


def _select_node(
    manifest: dict[str, Any], block: Block, block_config: BlockConfig
) -> tuple[dict[str, Any] | None, str | None, list[str]]:
    nodes = manifest.get("nodes") or {}
    models = {
        unique_id: node
        for unique_id, node in nodes.items()
        if node.get("resource_type") == "model"
    }
    raw = block.configuration
    selector = (
        block_config.dbt_model
        or raw.get("dbt_model")
        or raw.get("model")
        or raw.get("file_path")
    )

    if selector:
        wanted = str(selector).strip().rstrip("/")
        matches = [
            (unique_id, node)
            for unique_id, node in models.items()
            if unique_id == wanted
            or unique_id.endswith(f".{wanted}")
            or node.get("name") == wanted
            or str(node.get("original_file_path") or "").endswith(wanted)
            or str(node.get("path") or "").endswith(wanted)
        ]
    else:
        names = {block.name, block.uuid}
        file_path = raw.get("file_path")
        if file_path:
            names.add(Path(str(file_path)).stem)
        matches = [
            (unique_id, node)
            for unique_id, node in models.items()
            if node.get("name") in names
            or Path(str(node.get("original_file_path") or "")).stem in names
        ]

    candidates = [unique_id for unique_id, _ in matches]
    if len(matches) == 1:
        unique_id, node = matches[0]
        return node, unique_id, candidates
    return None, None, candidates


def _node_table(
    node: dict[str, Any], profile_name: str, profile: ProfileConfig
) -> TableRef | None:
    name = node.get("alias") or node.get("identifier") or node.get("name")
    if not name:
        return None
    return TableRef(
        profile=profile_name,
        database=node.get("database") or profile.database,
        schema=node.get("schema") or profile.default_schema,
        table=str(name),
    )


def _dependency_tables(
    node: dict[str, Any],
    manifest: dict[str, Any],
    profile_name: str,
    profile: ProfileConfig,
) -> list[TableRef]:
    nodes = manifest.get("nodes") or {}
    sources = manifest.get("sources") or {}
    tables: dict[str, TableRef] = {}
    for unique_id in (node.get("depends_on") or {}).get("nodes") or []:
        dependency = nodes.get(unique_id) or sources.get(unique_id)
        if dependency is None:
            continue
        if dependency.get("resource_type") == "model":
            materialized = str(
                (dependency.get("config") or {}).get("materialized") or "view"
            ).lower()
            if materialized == "ephemeral":
                continue
        table = _node_table(dependency, profile_name, profile)
        if table is not None:
            tables.setdefault(str(table), table)
    return list(tables.values())


def _issue(block: Block, pipeline: Pipeline, code: str, message: str) -> errors.Issue:
    return errors.Issue(
        code=code,
        message=message,
        pipeline=pipeline.uuid,
        block=block.uuid,
        detail={"block_type": block.type, "language": block.language},
    )


def _unmodelled(
    block: Block, pipeline: Pipeline, issues: list[Any]
) -> BlockTransform:
    return BlockTransform(
        block_uuid=block.uuid,
        inputs=[DatasetKey.for_block(uuid) for uuid in block.upstream],
        outputs=[DatasetKey.for_block(block.uuid)],
        columns={},
        confidence=CONFIDENCE_TABLE_ONLY,
        issues=issues,
    )
