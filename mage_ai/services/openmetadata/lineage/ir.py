"""Intermediate representation shared by readers, analysers, resolver and writer."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

CONFIDENCE_EXACT = "exact"
CONFIDENCE_CONTRACT = "contracted"
CONFIDENCE_INFERRED = "inferred"
CONFIDENCE_TABLE_ONLY = "table_only"
CONFIDENCE_UNMODELLED = "unmodelled"

STATUS_OK = "ok"
STATUS_PARTIAL = "partial"
STATUS_FAILED = "failed"
STATUS_UNSUPPORTED = "unsupported"
STATUS_DELEGATED = "delegated"


@dataclass(frozen=True)
class TableRef:
    """A table as written in the pipeline, before OpenMetadata resolution."""

    profile: str | None
    database: str | None
    schema: str | None
    table: str

    @property
    def raw(self) -> str:
        parts = [part for part in (self.database, self.schema, self.table) if part]
        return ".".join(parts)

    def with_defaults(self, database: str | None, schema: str | None) -> "TableRef":
        return TableRef(
            profile=self.profile,
            database=self.database or database,
            schema=self.schema or schema,
            table=self.table,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "profile": self.profile,
            "database": self.database,
            "schema": self.schema,
            "table": self.table,
            "raw": self.raw,
        }

    def __str__(self) -> str:
        return self.raw


@dataclass(frozen=True)
class DatasetKey:
    """Identity of a block input or output.

    A physical table is a node in the published graph. A ``virtual`` dataset is an
    in-memory block output that is collapsed during propagation and never published.
    """

    kind: Literal["table", "virtual"]
    table: TableRef | None = None
    block_uuid: str | None = None

    @classmethod
    def for_table(cls, table: TableRef) -> "DatasetKey":
        return cls(kind="table", table=table)

    @classmethod
    def for_block(cls, block_uuid: str) -> "DatasetKey":
        return cls(kind="virtual", block_uuid=block_uuid)

    @property
    def label(self) -> str:
        if self.kind == "table" and self.table is not None:
            return self.table.raw
        return f"block:{self.block_uuid}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "table": self.table.to_dict() if self.table else None,
            "block_uuid": self.block_uuid,
        }


@dataclass(frozen=True)
class ColumnOrigin:
    """Where an output column ultimately comes from."""

    column: str
    table: TableRef | None = None
    block_uuid: str | None = None

    @property
    def is_physical(self) -> bool:
        return self.table is not None

    def to_dict(self) -> dict[str, Any]:
        return {
            "column": self.column,
            "table": self.table.to_dict() if self.table else None,
            "block_uuid": self.block_uuid,
        }


@dataclass
class ColumnMap:
    output: str
    origins: list[ColumnOrigin] = field(default_factory=list)
    expression: str | None = None
    function: str | None = None


@dataclass
class Block:
    uuid: str
    name: str
    type: str
    language: str
    code: str
    upstream: list[str] = field(default_factory=list)
    downstream: list[str] = field(default_factory=list)
    configuration: dict[str, Any] = field(default_factory=dict)
    source_path: str | None = None

    @property
    def driver(self) -> str | None:
        value = self.configuration.get("data_provider")
        return str(value).lower() if value else None

    @property
    def profile(self) -> str | None:
        value = self.configuration.get("data_provider_profile")
        return str(value) if value else None


@dataclass
class Pipeline:
    uuid: str
    name: str
    project: str
    blocks: dict[str, Block] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)
    source_path: str | None = None

    def topo_order(self) -> list[Block]:
        """Kahn topological sort; unknown upstream references are ignored."""
        indegree = {uuid: 0 for uuid in self.blocks}
        children: dict[str, list[str]] = {uuid: [] for uuid in self.blocks}
        for uuid, block in self.blocks.items():
            for upstream in block.upstream:
                if upstream in self.blocks:
                    indegree[uuid] += 1
                    children[upstream].append(uuid)
        queue = sorted(uuid for uuid, degree in indegree.items() if degree == 0)
        order: list[str] = []
        while queue:
            uuid = queue.pop(0)
            order.append(uuid)
            for child in children[uuid]:
                indegree[child] -= 1
                if indegree[child] == 0:
                    queue.append(child)
        # Cycles or dangling references: keep remaining blocks in stable order.
        for uuid in sorted(self.blocks):
            if uuid not in order:
                order.append(uuid)
        return [self.blocks[uuid] for uuid in order]


@dataclass
class BlockTransform:
    block_uuid: str
    inputs: list[DatasetKey]
    outputs: list[DatasetKey]
    columns: dict[str, ColumnMap] = field(default_factory=dict)
    confidence: str = CONFIDENCE_TABLE_ONLY
    sql: str | None = None
    issues: list[Any] = field(default_factory=list)

    @property
    def output(self) -> DatasetKey | None:
        return self.outputs[0] if self.outputs else None

    def column_map(self) -> dict[str, list[ColumnOrigin]]:
        return {name: mapping.origins for name, mapping in self.columns.items()}


@dataclass
class ColumnEdge:
    from_table: TableRef
    from_column: str
    to_table: TableRef
    to_column: str
    function: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "from_table": self.from_table.to_dict(),
            "from_column": self.from_column,
            "to_table": self.to_table.to_dict(),
            "to_column": self.to_column,
            "function": self.function,
        }


@dataclass
class LineageEdge:
    from_table: TableRef
    to_table: TableRef
    task: str | None = None
    sql: str | None = None
    columns: list[ColumnEdge] = field(default_factory=list)
    confidence: str = CONFIDENCE_TABLE_ONLY

    def to_dict(self) -> dict[str, Any]:
        return {
            "from_table": self.from_table.to_dict(),
            "to_table": self.to_table.to_dict(),
            "task": self.task,
            "sql": self.sql,
            "confidence": self.confidence,
            "columns": [column.to_dict() for column in self.columns],
        }


@dataclass
class ResolvedTable:
    table: TableRef
    fqn: str
    uuid: str
    columns: list[str] = field(default_factory=list)


@dataclass
class Resolution:
    requested: TableRef
    resolved: ResolvedTable | None = None
    status: str = "unresolved"
    candidates: list[str] = field(default_factory=list)
    message: str | None = None


@dataclass
class LineagePlan:
    pipeline_uuid: str
    pipeline_name: str
    project: str
    edges: list[LineageEdge] = field(default_factory=list)
    issues: list[Any] = field(default_factory=list)
    status: str = STATUS_OK
    fingerprint: str | None = None

    def referenced_tables(self) -> list[TableRef]:
        seen: dict[str, TableRef] = {}
        for edge in self.edges:
            seen.setdefault(str(edge.from_table), edge.from_table)
            seen.setdefault(str(edge.to_table), edge.to_table)
        return list(seen.values())

    def to_dict(self) -> dict[str, Any]:
        return {
            "pipeline_uuid": self.pipeline_uuid,
            "pipeline_name": self.pipeline_name,
            "project": self.project,
            "status": self.status,
            "fingerprint": self.fingerprint,
            "edges": [edge.to_dict() for edge in self.edges],
            "issues": [issue.to_dict() for issue in self.issues],
        }
