"""Explicit column contracts for Python blocks.

Mage Python blocks are arbitrary code, so column lineage is opt-in. A contract
declares the block's physical inputs/outputs and how output columns are derived.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .. import errors
from ..config import Config
from ..ir import (
    CONFIDENCE_CONTRACT,
    CONFIDENCE_TABLE_ONLY,
    Block,
    BlockTransform,
    ColumnMap,
    ColumnOrigin,
    DatasetKey,
    Pipeline,
    TableRef,
)


@dataclass
class DatasetSpec:
    kind: str  # "table" | "block"
    raw: str
    table: TableRef | None = None
    block_uuid: str | None = None

    def key(self) -> DatasetKey:
        if self.kind == "block":
            return DatasetKey.for_block(self.block_uuid or "")
        assert self.table is not None
        return DatasetKey.for_table(self.table)


@dataclass
class ColumnSpec:
    output: str
    origins: list[ColumnOrigin] = field(default_factory=list)
    function: str | None = None


@dataclass
class Contract:
    mode: str = "warn"
    inputs: list[DatasetSpec] = field(default_factory=list)
    outputs: list[DatasetSpec] = field(default_factory=list)
    columns: list[ColumnSpec] = field(default_factory=list)
    issues: list[Any] = field(default_factory=list)


def parse_contract(
    block: Block,
    pipeline: Pipeline,
    config: Config,
    raw: dict[str, Any],
) -> Contract:
    profile_name = block.profile or "default"
    defaults = _profile_defaults(config, profile_name)
    contract = Contract(mode=str(raw.get("mode", "warn")).lower())

    for value in raw.get("inputs") or []:
        spec = _parse_dataset(value, profile_name, defaults, contract, block)
        if spec is not None:
            contract.inputs.append(spec)

    for value in raw.get("outputs") or []:
        spec = _parse_dataset(value, profile_name, defaults, contract, block)
        if spec is not None:
            contract.outputs.append(spec)

    for entry in raw.get("columns") or []:
        if not isinstance(entry, dict) or not entry.get("to"):
            contract.issues.append(
                errors.Issue(
                    code=errors.CONTRACT_ERROR,
                    message="Each contract column needs a 'to' field",
                    pipeline=pipeline.uuid,
                    block=block.uuid,
                )
            )
            continue
        origins = []
        for source in entry.get("from") or []:
            origin = _parse_origin(
                source, profile_name, defaults, block, contract, pipeline
            )
            if origin is not None:
                origins.append(origin)
        contract.columns.append(
            ColumnSpec(
                output=str(entry["to"]).split(".")[-1],
                origins=origins,
                function=entry.get("function"),
            )
        )

    return contract


def analyze_contract_block(
    block: Block,
    pipeline: Pipeline,
    config: Config,
    raw: dict[str, Any],
) -> BlockTransform:
    contract = parse_contract(block, pipeline, config, raw)

    inputs = [spec.key() for spec in contract.inputs] or [
        DatasetKey.for_block(uuid) for uuid in block.upstream
    ]
    outputs = [spec.key() for spec in contract.outputs]
    if not outputs:
        outputs = [DatasetKey.for_block(block.uuid)]

    columns = {
        spec.output: ColumnMap(
            output=spec.output,
            origins=list(spec.origins),
            function=spec.function,
        )
        for spec in contract.columns
    }

    if columns:
        confidence = CONFIDENCE_CONTRACT
    else:
        confidence = CONFIDENCE_TABLE_ONLY

    return BlockTransform(
        block_uuid=block.uuid,
        inputs=inputs,
        outputs=outputs,
        columns=columns,
        confidence=confidence,
        sql=None,
        issues=list(contract.issues),
    )


def _profile_defaults(
    config: Config, profile_name: str
) -> tuple[str | None, str | None]:
    try:
        profile = config.profile(profile_name)
    except Exception:  # noqa: BLE001 - offline plan without a profile is still useful
        return None, None
    return profile.database, profile.default_schema


def _parse_dataset(
    value: Any,
    profile: str,
    defaults: tuple[str | None, str | None],
    contract: Contract,
    block: Block,
) -> DatasetSpec | None:
    if not isinstance(value, str) or not value.strip():
        contract.issues.append(
            errors.Issue(
                code=errors.CONTRACT_ERROR,
                message=f"Invalid dataset reference: {value!r}",
                block=block.uuid,
            )
        )
        return None
    text = value.strip()
    if text.startswith("block:"):
        return DatasetSpec(kind="block", raw=text, block_uuid=text.split(":", 1)[1])
    parts = _split_table(text)
    if parts is None:
        contract.issues.append(
            errors.Issue(
                code=errors.CONTRACT_ERROR,
                message=f"Table reference '{text}' needs at least a table name",
                block=block.uuid,
            )
        )
        return None
    database, schema, table = parts
    return DatasetSpec(
        kind="table",
        raw=text,
        table=TableRef(
            profile=profile,
            database=database or defaults[0],
            schema=schema or defaults[1],
            table=table,
        ),
    )


def _parse_origin(
    value: Any,
    profile: str,
    defaults: tuple[str | None, str | None],
    block: Block,
    contract: Contract,
    pipeline: Pipeline,
) -> ColumnOrigin | None:
    if not isinstance(value, str) or "." not in value:
        contract.issues.append(
            errors.Issue(
                code=errors.CONTRACT_ERROR,
                message=(
                    f"Column origin '{value}' must be '<table>.<column>' "
                    "or 'block:<uuid>.<column>'"
                ),
                pipeline=pipeline.uuid,
                block=block.uuid,
            )
        )
        return None
    text = value.strip()
    if text.startswith("block:"):
        reference, _, column = text.partition(".")
        return ColumnOrigin(block_uuid=reference.split(":", 1)[1], column=column)
    reference, _, column = text.rpartition(".")
    parts = _split_table(reference)
    if parts is None:
        contract.issues.append(
            errors.Issue(
                code=errors.CONTRACT_ERROR,
                message=f"Could not parse table in '{value}'",
                pipeline=pipeline.uuid,
                block=block.uuid,
            )
        )
        return None
    database, schema, table = parts
    return ColumnOrigin(
        table=TableRef(
            profile=profile,
            database=database or defaults[0],
            schema=schema or defaults[1],
            table=table,
        ),
        column=column,
    )


def _split_table(text: str) -> tuple[str | None, str | None, str] | None:
    cleaned = text.strip().strip('"').strip("`")
    if not cleaned:
        return None
    parts = [part.strip().strip('"').strip("`") for part in cleaned.split(".")]
    if len(parts) == 1:
        return None, None, parts[0]
    if len(parts) == 2:
        return None, parts[0], parts[1]
    return ".".join(parts[:-2]) or None, parts[-2], parts[-1]
