"""Coverage report: what was referenced, what resolved, what is missing."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from . import errors
from .ir import LineagePlan, Resolution, TableRef


@dataclass
class Coverage:
    pipeline_uuid: str
    pipeline_name: str
    project: str
    referenced: int = 0
    wired: int = 0
    missing: list[dict[str, Any]] = field(default_factory=list)
    ambiguous: list[dict[str, Any]] = field(default_factory=list)
    columns_projected: int = 0
    columns_mapped: int = 0
    unmodelled_blocks: list[str] = field(default_factory=list)
    platforms: list[str] = field(default_factory=list)
    status: str = "ok"

    @property
    def column_coverage(self) -> float:
        if self.columns_projected == 0:
            return 1.0 if self.columns_mapped == 0 else 0.0
        return round(self.columns_mapped / self.columns_projected, 4)

    def to_dict(self) -> dict[str, Any]:
        return {
            "pipeline": self.pipeline_uuid,
            "pipeline_name": self.pipeline_name,
            "project": self.project,
            "status": self.status,
            "referenced_tables": self.referenced,
            "wired_tables": self.wired,
            "missing_in_catalog": self.missing,
            "ambiguous_references": self.ambiguous,
            "columns_projected": self.columns_projected,
            "columns_mapped": self.columns_mapped,
            "column_coverage": self.column_coverage,
            "unmodelled_blocks": self.unmodelled_blocks,
            "platforms": self.platforms,
        }


def build_coverage(
    plan: LineagePlan,
    resolutions: dict[str, Resolution],
    platforms: list[str] | None = None,
) -> Coverage:
    coverage = Coverage(
        pipeline_uuid=plan.pipeline_uuid,
        pipeline_name=plan.pipeline_name,
        project=plan.project,
        platforms=platforms or [],
    )

    referenced: dict[str, TableRef] = {}
    for edge in plan.edges:
        referenced.setdefault(str(edge.from_table), edge.from_table)
        referenced.setdefault(str(edge.to_table), edge.to_table)

    coverage.referenced = len(referenced)
    for key, table in referenced.items():
        resolution = resolutions.get(key)
        if resolution is not None and resolution.resolved is not None:
            coverage.wired += 1
            continue
        entry = {
            "table": str(table),
            "candidates": resolution.candidates if resolution else [],
            "message": resolution.message if resolution else "not resolved",
        }
        if resolution is not None and resolution.status == "ambiguous":
            coverage.ambiguous.append(entry)
        else:
            coverage.missing.append(entry)

    seen_projected: dict[str, set[str]] = {}
    for edge in plan.edges:
        target = str(edge.to_table)
        bucket = seen_projected.setdefault(target, set())
        for column in edge.columns:
            bucket.add(column.to_column.lower())

    for key, mapped_names in seen_projected.items():
        resolution = resolutions.get(key)
        catalog_columns = (
            resolution.resolved.columns
            if resolution is not None and resolution.resolved is not None
            else []
        )
        if catalog_columns:
            coverage.columns_projected += len(catalog_columns)
            coverage.columns_mapped += sum(
                1 for column in catalog_columns if column.lower() in mapped_names
            )
        else:
            coverage.columns_projected += len(mapped_names)
            coverage.columns_mapped += len(mapped_names)

    coverage.unmodelled_blocks = sorted(
        {
            issue.block
            for issue in plan.issues
            if issue.code == errors.UNMODELLED_BLOCK and issue.block
        }
    )

    if coverage.missing or coverage.ambiguous:
        coverage.status = "partial"
    if plan.status != "ok":
        coverage.status = "partial"
    return coverage
