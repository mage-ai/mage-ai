from mage_ai.data_preparation.models.block import (
    Block,
    CallbackBlock,
    ConditionalBlock,
    SensorBlock,
)
from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.block.extension.block import ExtensionBlock
from mage_ai.data_preparation.models.constants import BlockType

BLOCK_TYPE_TO_CLASS = {
    BlockType.CALLBACK: CallbackBlock,
    BlockType.CONDITIONAL: ConditionalBlock,
    BlockType.CUSTOM: Block,
    BlockType.DATA_EXPORTER: Block,
    BlockType.DATA_LOADER: Block,
    BlockType.DBT: DBTBlock,
    BlockType.EXTENSION: ExtensionBlock,
    BlockType.MARKDOWN: Block,
    BlockType.SCRATCHPAD: Block,
    BlockType.TRANSFORMER: Block,
    BlockType.SENSOR: SensorBlock,
}

TAG_CONDITION = 'condition'
TAG_DYNAMIC = 'dynamic'
TAG_DYNAMIC_CHILD = 'dynamic_child'
TAG_REDUCE_OUTPUT = 'reduce_output'
TAG_REPLICA = 'replica'

TAG_DBT_SNAPSHOT = 'snapshot'

LOG_PARTITION_EDIT_PIPELINE = 'edit_pipeline'
