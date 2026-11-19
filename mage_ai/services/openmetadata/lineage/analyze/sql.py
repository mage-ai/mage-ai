"""SQL block analysis with sqlglot.

Produces, for one SQL block:

* the physical output table (from CTAS/INSERT, or Mage's configured/auto name)
* the physical input tables
* a column map: output column -> originating input columns

``SELECT *`` is expanded from the catalog when available; otherwise the block is
reported as table-only rather than guessed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import sqlglot
from sqlglot import exp
from sqlglot.errors import SqlglotError

from .. import errors
from ..config import Config
from ..ir import (
    CONFIDENCE_EXACT,
    CONFIDENCE_INFERRED,
    CONFIDENCE_TABLE_ONLY,
    Block,
    BlockTransform,
    ColumnMap,
    ColumnOrigin,
    DatasetKey,
    Pipeline,
    TableRef,
)
from .catalog import ColumnCatalog

# Statements that never produce a table. ``Alter`` is missing from older sqlglot
# releases, so resolve the tuple defensively instead of importing the name directly.
NON_WRITING_STATEMENTS = tuple(
    getattr(exp, name)
    for name in ("Drop", "Delete", "Update", "Alter")
    if hasattr(exp, name)
)

DIALECT_BY_DRIVER = {
    "postgres": "postgres",
    "postgresql": "postgres",
    "timescale": "postgres",
    "redshift": "redshift",
    "mysql": "mysql",
    "mariadb": "mysql",
    "mssql": "tsql",
    "sqlserver": "tsql",
    "azuresql": "tsql",
    "oracle": "oracle",
    "bigquery": "bigquery",
    "snowflake": "snowflake",
    "clickhouse": "clickhouse",
    "trino": "trino",
    "presto": "presto",
    "druid": "mysql",
    "pinot": "mysql",
    "spark": "spark",
    "databricks": "databricks",
    "duckdb": "duckdb",
    "sqlite": "sqlite",
}

READ_ONLY_TYPES = {"data_loader"}


@dataclass
class SourceScope:
    alias: str
    table: TableRef | None
    columns: dict[str, list[ColumnOrigin]] | None
    base_tables: list[TableRef] = field(default_factory=list)


@dataclass
class SelectScope:
    projections: dict[str, ColumnMap] = field(default_factory=dict)
    sources: list[TableRef] = field(default_factory=list)
    complete: bool = True


def dialect_for(driver: str | None) -> str | None:
    if not driver:
        return None
    candidate = DIALECT_BY_DRIVER.get(driver.lower())
    if candidate is None:
        return None
    try:
        sqlglot.Dialect.get_or_raise(candidate)
    except Exception:  # pragma: no cover - defensive against sqlglot changes
        return None
    return candidate


def analyze_sql_block(
    block: Block,
    pipeline: Pipeline,
    config: Config,
    catalog: ColumnCatalog,
    sql_override: str | None = None,
    target_override: TableRef | None = None,
) -> BlockTransform:
    """Analyse a SQL block into a transform.

    ``sql_override`` and ``target_override`` are used by the dbt analyser: dbt ships
    compiled SELECT statements plus the model's physical target, instead of a block
    that writes its own table.
    """
    profile_name = block.profile or "default"
    profile = config.profile(profile_name)
    driver = block.driver or profile.driver
    dialect = dialect_for(driver)

    sql = sql_override or _block_sql(block, config, pipeline)
    issues: list[Any] = []
    transform = BlockTransform(
        block_uuid=block.uuid,
        inputs=[],
        outputs=[],
        confidence=CONFIDENCE_TABLE_ONLY,
        sql=sql,
    )

    try:
        statements = sqlglot.parse(sql, read=dialect)
    except SqlglotError as exc:
        issues.append(
            errors.Issue(
                code=errors.PARSE_ERROR,
                message=f"Could not parse SQL block: {exc}",
                pipeline=pipeline.uuid,
                block=block.uuid,
            )
        )
        transform.issues = issues
        transform.inputs = _default_inputs(block)
        transform.outputs = [DatasetKey.for_block(block.uuid)]
        return transform

    target_default = target_override or _target_table(block, pipeline, config, profile)
    complete = True
    inputs: dict[str, TableRef] = {}
    columns: dict[str, ColumnMap] = {}
    outputs: dict[str, TableRef] = {}

    for statement in statements:
        if statement is None:
            continue
        select: exp.Expression | None = None
        target: TableRef | None = None

        if isinstance(statement, exp.Create):
            kind = str(statement.args.get("kind") or "").upper()
            if kind in {"TABLE", "VIEW"} and statement.expression is not None:
                select = _as_query(statement.expression)
                target = _table_ref_from_expression(statement.this, profile_name, target_default)
        elif isinstance(statement, exp.Insert):
            select = _as_query(statement.expression)
            target = _table_ref_from_expression(statement.this, profile_name, target_default)
        elif isinstance(statement, (exp.Select, exp.Union)):
            select = statement
            target = target_default
        elif isinstance(statement, NON_WRITING_STATEMENTS):
            continue
        else:
            continue

        if select is None or target is None:
            continue

        scope = _analyze_statement(
            select, statement, profile_name, target_default, catalog, issues, block
        )
        complete = complete and scope.complete
        for table in scope.sources:
            inputs.setdefault(str(table), table)
        for name, mapping in scope.projections.items():
            columns.setdefault(name, mapping)
        outputs.setdefault(str(target), target)

    if not outputs:
        # Nothing wrote a table: treat the block as a virtual producer.
        transform.inputs = _default_inputs(block)
        transform.outputs = [DatasetKey.for_block(block.uuid)]
        transform.issues = issues
        return transform

    transform.inputs = [DatasetKey.for_table(table) for table in inputs.values()]
    transform.outputs = [DatasetKey.for_table(table) for table in outputs.values()]
    transform.columns = columns
    transform.issues = issues
    if columns and complete:
        transform.confidence = CONFIDENCE_EXACT
    elif columns:
        transform.confidence = CONFIDENCE_INFERRED
    else:
        transform.confidence = CONFIDENCE_TABLE_ONLY
    return transform


# ---------------------------------------------------------------------------
# target / input helpers
# ---------------------------------------------------------------------------


def _block_sql(block: Block, config: Config, pipeline: Pipeline) -> str:
    override = config.pipeline(pipeline.uuid).block(block.uuid).sql_override
    if override:
        return override
    return block.code


def _target_table(block: Block, pipeline: Pipeline, config: Config, profile: Any) -> TableRef:
    cfg = block.configuration
    database = cfg.get("data_provider_database") or profile.database
    schema = cfg.get("data_provider_schema") or profile.default_schema
    table_name = cfg.get("table_name") or f"{pipeline.uuid}_{block.uuid}"
    return TableRef(
        profile=block.profile or "default",
        database=database,
        schema=schema,
        table=table_name,
    )


def _table_ref_from_expression(
    node: exp.Expression,
    profile: str,
    fallback: TableRef,
) -> TableRef | None:
    table: exp.Table | None = None
    if isinstance(node, exp.Schema) and isinstance(node.this, exp.Table):
        table = node.this
    elif isinstance(node, exp.Table):
        table = node
    if table is None:
        return None
    return TableRef(
        profile=profile,
        database=table.catalog or fallback.database,
        schema=table.db or fallback.schema,
        table=table.name,
    )


def _default_inputs(block: Block) -> list[DatasetKey]:
    return [DatasetKey.for_block(uuid) for uuid in block.upstream]


def _as_query(node: Any) -> exp.Expression | None:
    if isinstance(node, (exp.Select, exp.Union, exp.Subquery)):
        return node
    return None


# ---------------------------------------------------------------------------
# select scope analysis
# ---------------------------------------------------------------------------


def _analyze_statement(
    select: exp.Expression,
    statement: exp.Expression,
    profile: str,
    fallback: TableRef,
    catalog: ColumnCatalog,
    issues: list[Any],
    block: Block,
) -> SelectScope:
    """Analyse a query, taking CTEs from the enclosing INSERT/CREATE into account."""
    ctes: dict[str, SelectScope] = {}
    with_clause = statement.args.get("with_") or statement.args.get("with")
    if with_clause is not None:
        for cte in with_clause.expressions:
            ctes[cte.alias_or_name.lower()] = _analyze_query(
                cte.this, profile, fallback, catalog, issues, block, ctes
            )
    return _analyze_query(select, profile, fallback, catalog, issues, block, ctes)


def _analyze_query(
    query: exp.Expression,
    profile: str,
    fallback: TableRef,
    catalog: ColumnCatalog,
    issues: list[Any],
    block: Block,
    ctes: dict[str, SelectScope] | None = None,
) -> SelectScope:
    if isinstance(query, exp.Subquery):
        return _analyze_query(query.this, profile, fallback, catalog, issues, block, ctes)
    if isinstance(query, exp.Union):
        left = _analyze_query(query.this, profile, fallback, catalog, issues, block, ctes)
        right = _analyze_query(query.expression, profile, fallback, catalog, issues, block, ctes)
        merged_sources = list({str(t): t for t in (left.sources + right.sources)}.values())
        return SelectScope(
            projections=left.projections,
            sources=merged_sources,
            complete=left.complete and right.complete,
        )
    if not isinstance(query, exp.Select):
        return SelectScope(complete=False)

    scopes = dict(ctes or {})
    issue_start = len(issues)
    with_clause = query.args.get("with_") or query.args.get("with")
    if with_clause is not None:
        for cte in with_clause.expressions:
            name = cte.alias_or_name
            body = cte.this
            scopes[name.lower()] = _analyze_query(
                body, profile, fallback, catalog, issues, block, scopes
            )

    sources = _build_sources(query, profile, fallback, catalog, issues, block, scopes)
    projections: dict[str, ColumnMap] = {}
    complete = True

    for projection in query.expressions:
        if _is_star(projection):
            exported = _expand_star(projection, sources, issues, block)
            if exported is None:
                complete = False
            else:
                for name, mapping in exported.items():
                    projections[name] = mapping
            continue

        name, expression = _projection_name_and_expression(projection)
        if not name:
            continue
        origins = []
        for column in _project_columns(expression):
            origins.extend(_resolve_column(column, sources, issues, block))
        projections[name] = ColumnMap(
            output=name,
            origins=origins,
            expression=_expression_sql(expression),
            function=_function_label(expression),
        )

    base_tables = list({str(table): table for table in _source_tables(sources)}.values())
    column_issues = {
        errors.COLUMN_MISSING,
        errors.UNKNOWN_COLUMN,
        errors.UNKNOWN_ALIAS,
        errors.AMBIGUOUS_COLUMN,
    }
    if any(issue.code in column_issues for issue in issues[issue_start:]):
        complete = False
    return SelectScope(projections=projections, sources=base_tables, complete=complete)


def _build_sources(
    query: exp.Select,
    profile: str,
    fallback: TableRef,
    catalog: ColumnCatalog,
    issues: list[Any],
    block: Block,
    ctes: dict[str, SelectScope],
) -> list[SourceScope]:
    items: list[exp.Expression] = []
    from_clause = query.args.get("from_")
    if from_clause is not None:
        items.append(from_clause.this)
    for join in query.args.get("joins") or []:
        items.append(join.this)

    sources: list[SourceScope] = []
    for item in items:
        if isinstance(item, exp.Table):
            alias = item.alias_or_name
            cte = ctes.get(item.name.lower())
            if cte is not None:
                sources.append(
                    SourceScope(
                        alias=alias,
                        table=None,
                        columns={
                            name: list(mapping.origins) for name, mapping in cte.projections.items()
                        }
                        if cte.complete
                        else None,
                        base_tables=list(cte.sources),
                    )
                )
                continue
            table_ref = TableRef(
                profile=profile,
                database=item.catalog or fallback.database,
                schema=item.db or fallback.schema,
                table=item.name,
            )
            known = catalog.columns(table_ref)
            columns = (
                {name: [ColumnOrigin(column=name, table=table_ref)] for name in known}
                if known
                else None
            )
            sources.append(
                SourceScope(alias=alias, table=table_ref, columns=columns, base_tables=[table_ref])
            )
            continue

        if isinstance(item, exp.Subquery):
            inner = _analyze_query(item.this, profile, fallback, catalog, issues, block, ctes)
            columns = (
                {name: list(mapping.origins) for name, mapping in inner.projections.items()}
                if inner.complete
                else None
            )
            sources.append(
                SourceScope(
                    alias=item.alias_or_name,
                    table=None,
                    columns=columns,
                    base_tables=list(inner.sources),
                )
            )
            continue

        if isinstance(item, exp.Lateral):
            continue

    return sources


def _source_tables(sources: list[SourceScope]) -> list[TableRef]:
    tables: dict[str, TableRef] = {}
    for source in sources:
        if source.table is not None:
            tables.setdefault(str(source.table), source.table)
        for table in source.base_tables:
            tables.setdefault(str(table), table)
    return list(tables.values())


def _is_star(projection: exp.Expression) -> bool:
    if isinstance(projection, exp.Star):
        return True
    return isinstance(projection, exp.Column) and isinstance(projection.this, exp.Star)


def _expand_star(
    projection: exp.Expression,
    sources: list[SourceScope],
    issues: list[Any],
    block: Block,
) -> dict[str, ColumnMap] | None:
    qualifier = projection.table if isinstance(projection, exp.Column) else None
    selected = (
        [source for source in sources if source.alias.lower() == qualifier.lower()]
        if qualifier
        else sources
    )
    if not selected:
        issues.append(
            errors.Issue(
                code=errors.UNKNOWN_ALIAS,
                message=f"SELECT * references unknown alias '{qualifier}'",
                block=block.uuid,
            )
        )
        return None

    exported: dict[str, ColumnMap] = {}
    complete = True
    for source in selected:
        if source.columns is None:
            complete = False
            continue
        for name, origins in source.columns.items():
            exported[name] = ColumnMap(output=name, origins=list(origins))

    if not complete:
        issues.append(
            errors.Issue(
                code=errors.STAR_UNRESOLVED,
                message="SELECT * could not be fully expanded; column lineage is partial",
                block=block.uuid,
                detail={"alias": qualifier},
            )
        )
    return exported if exported or complete else None


def _projection_name_and_expression(
    projection: exp.Expression,
) -> tuple[str | None, exp.Expression]:
    if isinstance(projection, exp.Alias):
        return projection.alias, projection.this
    if isinstance(projection, exp.Column):
        return projection.name, projection
    return projection.sql(), projection


def _project_columns(expression: exp.Expression) -> list[exp.Column]:
    if isinstance(expression, exp.Column):
        return [expression]
    return [node for node in expression.find_all(exp.Column)]


def _resolve_column(
    column: exp.Column,
    sources: list[SourceScope],
    issues: list[Any],
    block: Block,
) -> list[ColumnOrigin]:
    name = column.name
    qualifier = column.table

    if qualifier:
        matches = [source for source in sources if source.alias.lower() == qualifier.lower()]
        if not matches:
            issues.append(
                errors.Issue(
                    code=errors.UNKNOWN_ALIAS,
                    message=f"Column '{qualifier}.{name}' references an unknown alias",
                    block=block.uuid,
                )
            )
            return []
        return _lookup(matches[0], name, issues, block)

    hits = [
        source
        for source in sources
        if source.columns is None or name in source.columns
    ]
    if len(hits) == 1:
        return _lookup(hits[0], name, issues, block)

    known = [source for source in hits if source.columns is not None]
    if len(known) == 1:
        return _lookup(known[0], name, issues, block)

    if not hits:
        issues.append(
            errors.Issue(
                code=errors.UNKNOWN_COLUMN,
                message=f"Column '{name}' not found in any source",
                block=block.uuid,
            )
        )
        return []

    issues.append(
        errors.Issue(
            code=errors.AMBIGUOUS_COLUMN,
            message=f"Column '{name}' is ambiguous across sources",
            block=block.uuid,
            detail={"sources": [source.alias for source in known or hits]},
        )
    )
    return []


def _lookup(
    source: SourceScope,
    name: str,
    issues: list[Any],
    block: Block,
) -> list[ColumnOrigin]:
    if source.columns is None:
        if source.table is not None:
            return [ColumnOrigin(column=name, table=source.table)]
        return []
    if name in source.columns:
        return list(source.columns[name])
    if source.table is not None:
        issues.append(
            errors.Issue(
                code=errors.COLUMN_MISSING,
                message=f"Column '{source.table.raw}.{name}' is not present in the catalog",
                block=block.uuid,
                detail={"table": source.table.to_dict(), "column": name},
            )
        )
    else:
        issues.append(
            errors.Issue(
                code=errors.UNKNOWN_COLUMN,
                message=f"Column '{name}' is not produced by the upstream block",
                block=block.uuid,
            )
        )
    return []


def _expression_sql(expression: exp.Expression) -> str:
    try:
        return expression.sql()
    except Exception:  # pragma: no cover - defensive
        return str(expression)


def _function_label(expression: exp.Expression) -> str | None:
    if isinstance(expression, exp.Column):
        return None
    if isinstance(expression, exp.Alias):
        return _function_label(expression.this)
    if isinstance(expression, exp.Literal):
        return None
    return _expression_sql(expression)
