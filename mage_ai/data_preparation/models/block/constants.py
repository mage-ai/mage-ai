from mage_ai.data_preparation.models.block import (
    Block,
    SensorBlock,
)
from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.constants import BlockType


BLOCK_TYPE_TO_CLASS = {
    BlockType.CUSTOM: Block,
    BlockType.DATA_EXPORTER: Block,
    BlockType.DATA_LOADER: Block,
    BlockType.DBT: DBTBlock,
    BlockType.SCRATCHPAD: Block,
    BlockType.TRANSFORMER: Block,
    BlockType.SENSOR: SensorBlock,
}
