"""Column-level propagation across the block DAG.

Virtual (in-memory) datasets are collapsed: every published edge runs between two
physical tables. Physical tables produced by SQL blocks are never collapsed, so a
staging -> mart chain keeps its intermediate hop.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import errors
from .analyze.block import analyze_block
from .analyze.catalog import ColumnCatalog, NullCatalog
from .config import Config
from .ir import (
    CONFIDENCE_UNMODELLED,
    STATUS_OK,
    STATUS_PARTIAL,
    BlockTransform,
    ColumnEdge,
    ColumnOrigin,
    DatasetKey,
    LineageEdge,
    LineagePlan,
    Pipeline,
    TableRef,
)

ERROR_CODES = {
    errors.PARSE_ERROR,
    errors.STAR_UNRESOLVED,
    errors.COLUMN_MISSING,
    errors.UNKNOWN_COLUMN,
    errors.UNKNOWN_ALIAS,
    errors.AMBIGUOUS_COLUMN,
    errors.CONTRACT_ERROR,
}


@dataclass
class BlockState:
    """What a block contributes to downstream blocks."""

    physical_outputs: list[TableRef] = field(default_factory=list)
    upstream_tables: list[TableRef] = field(default_factory=list)
    virtual_columns: dict[str, list[ColumnOrigin]] | None = None
    unresolved_columns: set[str] = field(default_factory=set)


def build_plan(
    pipeline: Pipeline,
    config: Config,
    catalog: ColumnCatalog | None = None,
) -> LineagePlan:
    catalog = catalog or NullCatalog()
    plan = LineagePlan(
        pipeline_uuid=pipeline.uuid,
        pipeline_name=pipeline.name,
        project=pipeline.project,
    )

    states: dict[str, BlockState] = {}
    transforms: dict[str, BlockTransform] = {}

    for block in pipeline.topo_order():
        transform = analyze_block(block, pipeline, config, catalog)
        if transform is None:
            continue
        transforms[block.uuid] = transform
        for issue in transform.issues:
            if issue.pipeline is None:
                issue.pipeline = pipeline.uuid
            plan.issues.append(issue)
        state = _apply_transform(block, transform, states, pipeline, plan)
        states[block.uuid] = state

    if any(issue.code in ERROR_CODES for issue in plan.issues):
        plan.status = STATUS_PARTIAL
    else:
        plan.status = STATUS_OK

    if any(
        transform.confidence == CONFIDENCE_UNMODELLED for transform in transforms.values()
    ) and config.defaults.on_unmodelled_block == "fail":
        plan.status = STATUS_PARTIAL

    return plan


def _apply_transform(
    block,
    transform: BlockTransform,
    states: dict[str, BlockState],
    pipeline: Pipeline,
    plan: LineagePlan,
) -> BlockState:
    state = BlockState()
    input_tables: dict[str, TableRef] = {}
    unresolved_inputs = False

    for key in transform.inputs:
        tables, resolved = _resolve_dataset(key, states)
        if not resolved:
            unresolved_inputs = True
        for table in tables:
            input_tables.setdefault(str(table), table)

    for mapping in transform.columns.values():
        for origin in mapping.origins:
            if origin.table is None and origin.block_uuid:
                tables, resolved = _resolve_dataset(
                    DatasetKey.for_block(origin.block_uuid), states
                )
                if not resolved:
                    unresolved_inputs = True
                for table in tables:
                    input_tables.setdefault(str(table), table)

    state.upstream_tables = list(input_tables.values())

    output = transform.output
    if output is None:
        return state

    if output.kind == "table" and output.table is not None:
        state.physical_outputs = [output.table]
        edges = _edges_for_table_output(
            transform, output.table, input_tables, states, unresolved_inputs
        )
        plan.edges.extend(edges)
        return state

    # Virtual output: keep the expanded column map and upstream tables for downstream.
    virtual_columns: dict[str, list[ColumnOrigin]] = {}
    unresolved: set[str] = set()
    for name, mapping in transform.columns.items():
        origins: list[ColumnOrigin] = []
        for origin in mapping.origins:
            if origin.table is not None:
                origins.append(origin)
                continue
            if not origin.block_uuid:
                continue
            upstream = states.get(origin.block_uuid)
            if upstream is None or upstream.virtual_columns is None:
                unresolved.add(name)
                continue
            source = upstream.virtual_columns.get(origin.column)
            if source is None:
                unresolved.add(name)
                continue
            origins.extend(source)
        if name in unresolved:
            virtual_columns.pop(name, None)
        else:
            virtual_columns[name] = origins

    state.virtual_columns = virtual_columns if not unresolved else None
    state.unresolved_columns = unresolved

    # Propagate physical upstream tables through the virtual node.
    state.upstream_tables = list(input_tables.values())
    if unresolved_inputs:
        plan.issues.append(
            errors.Issue(
                code=errors.UNMODELLED_BLOCK,
                message=(
                    f"Block '{block.uuid}' consumes data whose physical source could not be "
                    "determined; downstream column lineage is partial"
                ),
                pipeline=pipeline.uuid,
                block=block.uuid,
            )
        )
    return state


def _resolve_dataset(
    key: DatasetKey,
    states: dict[str, BlockState],
) -> tuple[list[TableRef], bool]:
    if key.kind == "table" and key.table is not None:
        return [key.table], True
    state = states.get(key.block_uuid or "")
    if state is None:
        return [], False
    if state.physical_outputs:
        return list(state.physical_outputs), True
    return list(state.upstream_tables), True


def _edges_for_table_output(
    transform: BlockTransform,
    output_table: TableRef,
    input_tables: dict[str, TableRef],
    states: dict[str, BlockState],
    unresolved_inputs: bool,
) -> list[LineageEdge]:
    columns_by_input: dict[str, list[ColumnEdge]] = {key: [] for key in input_tables}

    for output_column, mapping in transform.columns.items():
        for origin in mapping.origins:
            for origin_table, origin_column in _materialise_origin(origin, states):
                if str(origin_table) == str(output_table):
                    continue
                key = str(origin_table)
                if key not in input_tables:
                    input_tables[key] = origin_table
                    columns_by_input.setdefault(key, [])
                columns_by_input[key].append(
                    ColumnEdge(
                        from_table=origin_table,
                        from_column=origin_column,
                        to_table=output_table,
                        to_column=output_column,
                        function=mapping.function,
                    )
                )

    edges: list[LineageEdge] = []
    for key, table in input_tables.items():
        if str(table) == str(output_table):
            continue
        deduped = _dedupe_columns(columns_by_input.get(key, []))
        edges.append(
            LineageEdge(
                from_table=table,
                to_table=output_table,
                task=transform.block_uuid,
                sql=transform.sql,
                columns=deduped,
                confidence=transform.confidence,
            )
        )
    return edges


def _materialise_origin(
    origin: ColumnOrigin,
    states: dict[str, BlockState],
) -> list[tuple[TableRef, str]]:
    if origin.table is not None:
        return [(origin.table, origin.column)]
    if not origin.block_uuid:
        return []
    state = states.get(origin.block_uuid)
    if state is None:
        return []
    resolved: list[tuple[TableRef, str]] = []
    if state.physical_outputs:
        for table in state.physical_outputs:
            resolved.append((table, origin.column))
        return resolved
    if state.virtual_columns is not None:
        for upstream_origin in state.virtual_columns.get(origin.column, []):
            if upstream_origin.table is not None:
                resolved.append((upstream_origin.table, upstream_origin.column))
    return resolved


def _dedupe_columns(columns: list[ColumnEdge]) -> list[ColumnEdge]:
    seen: dict[tuple[str, str, str], ColumnEdge] = {}
    for column in columns:
        key = (str(column.from_table), column.from_column, column.to_column)
        seen.setdefault(key, column)
    return list(seen.values())
