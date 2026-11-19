"""OpenMetadata writer: pipeline/task upsert and native lineage edges."""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from .. import errors
from ..config import Config
from ..ir import LineageEdge, LineagePlan, Pipeline, Resolution, ResolvedTable
from ..omd import OmdClient, OmdError
from .spool import Spool

NAME_PATTERN = re.compile(r"[^A-Za-z0-9_.-]+")


@dataclass
class EmitResult:
    status: str = "ok"
    pipeline_fqn: str | None = None
    edges_written: int = 0
    edges_skipped: int = 0
    columns_written: int = 0
    missing_tables: list[str] = field(default_factory=list)
    missing_columns: list[str] = field(default_factory=list)
    issues: list[Any] = field(default_factory=list)
    spooled: int = 0
    unchanged: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "pipeline_fqn": self.pipeline_fqn,
            "edges_written": self.edges_written,
            "edges_skipped": self.edges_skipped,
            "columns_written": self.columns_written,
            "missing_tables": self.missing_tables,
            "missing_columns": self.missing_columns,
            "spooled": self.spooled,
            "unchanged": self.unchanged,
            "issues": [issue.to_dict() for issue in self.issues],
        }


class Emitter:
    def __init__(
        self,
        config: Config,
        client: OmdClient,
        spool: Spool | None = None,
    ):
        self.config = config
        self.client = client
        self.spool = spool
        self._lineage_extension: bool | None = None

    # -- custom property ------------------------------------------------
    def _lineage_extension_supported(self) -> bool:
        """Whether ``extension.lineage`` is accepted by this OpenMetadata.

        ``extension`` only accepts registered custom properties. We probe the
        ``pipeline`` type and, when ``custom_properties: auto`` (the default),
        register a string property named ``lineage`` once. Any failure degrades
        to local fingerprint state; it never fails the pipeline.
        """
        if self._lineage_extension is not None:
            return self._lineage_extension

        get_type = getattr(self.client, "get_type_by_name", None)
        add_property = getattr(self.client, "add_custom_property", None)
        if get_type is None or add_property is None:
            # Test doubles without the type API: assume the extension is writable.
            self._lineage_extension = True
            return True

        try:
            pipeline_type = get_type("pipeline")
        except OmdError:
            pipeline_type = None
        if self._has_property(pipeline_type, "lineage"):
            self._lineage_extension = True
            return True

        if (
            self.config.openmetadata.custom_properties != "auto"
            or not pipeline_type
            or not pipeline_type.get("id")
        ):
            self._lineage_extension = False
            return False

        try:
            string_type = get_type("string")
            if not string_type or not string_type.get("id"):
                raise OmdError("OpenMetadata type 'string' not found")
            pipeline_type = add_property(
                pipeline_type["id"],
                {
                    "name": "lineage",
                    "description": "Mage lineage connector state (fingerprint, last run).",
                    "propertyType": {"id": string_type["id"], "type": "type"},
                },
            )
        except OmdError:
            self._lineage_extension = False
            return False

        self._lineage_extension = self._has_property(pipeline_type, "lineage")
        return self._lineage_extension

    @staticmethod
    def _has_property(type_record: dict[str, Any] | None, name: str) -> bool:
        for prop in (type_record or {}).get("customProperties") or []:
            if isinstance(prop, dict) and prop.get("name") == name:
                return True
        return False

    # -- pipeline entity -------------------------------------------------
    def ensure_pipeline_service(self, service: str) -> None:
        """Create the custom pipeline service once, when it does not exist yet.

        Pipeline entities (and their tasks) are the only entities this connector may
        create. Failures are non-fatal: the pipeline write below reports the real error.
        """
        try:
            if self.client.get_pipeline_service(service) is not None:
                return
            self.client.create_pipeline_service(
                {
                    "name": service,
                    "serviceType": "CustomPipeline",
                    "description": "Pipelines published by the Mage lineage connector",
                    "connection": {"config": {"type": "CustomPipeline"}},
                }
            )
        except OmdError:
            return

    def pipeline_name(self, pipeline: Pipeline, project: str) -> str:
        name = self.config.openmetadata.pipeline_name_template.format(
            project=project, pipeline=pipeline.uuid
        )
        return NAME_PATTERN.sub("-", name).strip("-")

    def ensure_pipeline(
        self,
        pipeline: Pipeline,
        project: str,
        fingerprint: str | None = None,
        status: str = "ok",
        gaps: list[str] | None = None,
    ) -> tuple[str, str]:
        """Create or update the Mage pipeline entity. Returns (fqn, id)."""
        service = self.config.openmetadata.pipeline_service
        name = self.pipeline_name(pipeline, project)
        fqn = f"{service}.{name}"
        description = f"Mage pipeline '{pipeline.name}' ({pipeline.uuid})"
        tasks = [
            {"name": block.uuid}
            for block in sorted(pipeline.blocks.values(), key=lambda b: b.uuid)
        ]
        lineage_state = {
            "fingerprint": fingerprint,
            "last_status": status,
            "last_attempt_at": datetime.now(timezone.utc).isoformat(),
            "gaps": gaps or [],
        }
        # `lineage` is a string custom property in OpenMetadata; store JSON text.
        lineage_value = json.dumps(lineage_state, separators=(",", ":"))

        self.ensure_pipeline_service(service)
        existing = self.client.get_pipeline(fqn)
        write_extension = self._lineage_extension_supported()
        if existing is None:
            body = {
                "name": name,
                "service": service,
                "description": description,
                "tasks": tasks,
            }
            if write_extension:
                body["extension"] = {"lineage": lineage_value}
            if self.config.openmetadata.source_url:
                body["sourceUrl"] = self.config.openmetadata.source_url
            record = self.client.create_pipeline(body)
            return fqn, record.get("id") or ""

        pipeline_id = existing.get("id") or ""
        operations = [
            {"op": "add", "path": "/description", "value": description},
            {"op": "add", "path": "/tasks", "value": tasks},
        ]
        if write_extension:
            extension = dict(existing.get("extension") or {})
            extension["lineage"] = lineage_value
            operations.append({"op": "add", "path": "/extension", "value": extension})
        try:
            self.client.patch_pipeline(pipeline_id, operations)
        except OmdError:
            # Tasks/extension support varies by OMD version; lineage still succeeds.
            pass
        return fqn, pipeline_id

    # -- lineage ---------------------------------------------------------
    def emit(
        self,
        plan: LineagePlan,
        pipeline: Pipeline,
        resolutions: dict[str, Resolution],
        pipeline_id: str,
        deadline: float | None = None,
    ) -> EmitResult:
        result = EmitResult()
        pending: list[dict[str, Any]] = []

        for edge in plan.edges:
            if deadline is not None and time.monotonic() > deadline:
                pending.append(self._spool_record(edge, plan, "time_budget"))
                result.edges_skipped += 1
                continue

            payload, problem = self._edge_payload(edge, resolutions, pipeline_id)
            if problem is not None:
                result.issues.append(problem)
                if problem.code == errors.COLUMN_MISSING:
                    result.missing_columns.append(problem.message)
                result.edges_skipped += 1
                pending.append(self._spool_record(edge, plan, problem.code))
                continue

            try:
                self.client.add_lineage(payload)
            except OmdError as exc:
                result.issues.append(
                    errors.Issue(
                        code=exc.code or errors.UNREACHABLE,
                        message=str(exc),
                        pipeline=plan.pipeline_uuid,
                        block=edge.task,
                    )
                )
                result.edges_skipped += 1
                pending.append(self._spool_record(edge, plan, exc.code or "error"))
                continue

            result.edges_written += 1
            result.columns_written += len(edge.columns)

        result.missing_tables = [
            str(table)
            for key, table in self._referenced(plan).items()
            if resolutions.get(key) is None or resolutions[key].resolved is None
        ]

        if pending and self.spool is not None:
            for record in pending:
                self.spool.append(record)
            result.spooled = len(pending)

        if result.edges_written and result.edges_skipped:
            result.status = "partial"
        elif result.edges_written:
            result.status = "ok"
        elif result.edges_skipped:
            result.status = "failed"
        else:
            result.status = "ok"
        return result

    # -- payload ---------------------------------------------------------
    def _edge_payload(
        self,
        edge: LineageEdge,
        resolutions: dict[str, Resolution],
        pipeline_id: str,
    ) -> tuple[dict[str, Any], errors.Issue | None]:
        source = self._resolved(edge.from_table, resolutions)
        target = self._resolved(edge.to_table, resolutions)
        if source is None or target is None:
            missing = source is None and str(edge.from_table) or str(edge.to_table)
            return {}, errors.Issue(
                code=errors.MISSING_IN_CATALOG,
                message=f"Table '{missing}' is not present in OpenMetadata",
                block=edge.task,
            )

        columns_lineage: list[dict[str, Any]] = []
        for column in edge.columns:
            from_column = self._canonical_column(source, column.from_column)
            to_column = self._canonical_column(target, column.to_column)
            if from_column is None or to_column is None:
                return {}, errors.Issue(
                    code=errors.COLUMN_MISSING,
                    message=(
                        f"Column mapping {column.from_table}.{column.from_column} -> "
                        f"{column.to_table}.{column.to_column} could not be resolved"
                    ),
                    block=edge.task,
                    detail={
                        "from": column.from_column,
                        "to": column.to_column,
                        "source_columns": source.columns,
                        "target_columns": target.columns,
                    },
                )
            entry: dict[str, Any] = {
                "fromColumns": [f"{source.fqn}.{from_column}"],
                "toColumn": f"{target.fqn}.{to_column}",
            }
            if column.function:
                entry["function"] = column.function
            columns_lineage.append(entry)

        details: dict[str, Any] = {}
        if edge.sql:
            details["sqlQuery"] = edge.sql
        if columns_lineage:
            details["columnsLineage"] = columns_lineage
        if pipeline_id:
            details["pipeline"] = {"id": pipeline_id, "type": "pipeline"}

        return (
            {
                "edge": {
                    "fromEntity": {"id": source.uuid, "type": "table"},
                    "toEntity": {"id": target.uuid, "type": "table"},
                    "lineageDetails": details,
                }
            },
            None,
        )

    def _resolved(
        self, table, resolutions: dict[str, Resolution]
    ) -> ResolvedTable | None:
        resolution = resolutions.get(str(table))
        if resolution is None or resolution.resolved is None:
            return None
        return resolution.resolved

    @staticmethod
    def _canonical_column(resolved: ResolvedTable, name: str) -> str | None:
        if not resolved.columns:
            # Catalog did not return columns: trust the pipeline spelling.
            return name
        lookup = {column.lower(): column for column in resolved.columns}
        return lookup.get(name.lower())

    def _spool_record(self, edge: LineageEdge, plan: LineagePlan, reason: str) -> dict[str, Any]:
        return {
            "reason": reason,
            "pipeline": plan.pipeline_uuid,
            "project": plan.project,
            "task": edge.task,
            "from_table": str(edge.from_table),
            "to_table": str(edge.to_table),
            "columns": [
                {
                    "from_column": column.from_column,
                    "to_column": column.to_column,
                    "function": column.function,
                }
                for column in edge.columns
            ],
            "sql": edge.sql,
        }

    @staticmethod
    def _referenced(plan: LineagePlan) -> dict[str, Any]:
        referenced: dict[str, Any] = {}
        for edge in plan.edges:
            referenced.setdefault(str(edge.from_table), edge.from_table)
            referenced.setdefault(str(edge.to_table), edge.to_table)
        return referenced
