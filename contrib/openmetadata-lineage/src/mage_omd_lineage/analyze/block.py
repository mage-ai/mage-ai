"""Dispatch a Mage block to the right analyser."""

from __future__ import annotations

from typing import Any

from .. import errors
from ..config import Config
from ..ir import (
    CONFIDENCE_UNMODELLED,
    Block,
    BlockTransform,
    DatasetKey,
    Pipeline,
)
from .catalog import ColumnCatalog
from .contracts import analyze_contract_block
from .dbt import analyze_dbt_block
from .sql import analyze_sql_block

# Blocks that never produce or move data.
NON_DATA_TYPES = {
    "chart",
    "markdown",
    "scratchpad",
    "sensor",
    "callback",
    "conditional",
    "extension",
}

# Blocks whose output is opaque until a contract is provided.
OPAQUE_TYPES = {"data_loader", "data_exporter", "transformer", "custom", "dbt"}


def analyze_block(
    block: Block,
    pipeline: Pipeline,
    config: Config,
    catalog: ColumnCatalog,
) -> BlockTransform | None:
    if block.type in NON_DATA_TYPES:
        return None

    block_config = config.pipeline(pipeline.uuid).block(block.uuid)
    if block_config.skip or block_config.disabled:
        return None

    if block_config.contract:
        return analyze_contract_block(block, pipeline, config, block_config.contract)

    if block_config.sql_override:
        return analyze_sql_block(block, pipeline, config, catalog)

    if block.language == "sql" or block.type == "dbt":
        if block.type == "dbt":
            return analyze_dbt_block(block, pipeline, config, catalog)
        return analyze_sql_block(block, pipeline, config, catalog)

    return _unmodelled(block, pipeline, "Python block has no lineage contract")


def _unmodelled(block: Block, pipeline: Pipeline, reason: str) -> BlockTransform:
    issue: Any = errors.Issue(
        code=errors.UNMODELLED_BLOCK,
        message=reason,
        pipeline=pipeline.uuid,
        block=block.uuid,
        detail={"block_type": block.type, "language": block.language},
    )
    return BlockTransform(
        block_uuid=block.uuid,
        inputs=[DatasetKey.for_block(uuid) for uuid in block.upstream],
        outputs=[DatasetKey.for_block(block.uuid)],
        columns={},
        confidence=CONFIDENCE_UNMODELLED,
        issues=[issue],
    )
