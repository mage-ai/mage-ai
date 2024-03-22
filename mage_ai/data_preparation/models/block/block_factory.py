from mage_ai.data_preparation.models.block import Block, CallbackBlock, ConditionalBlock
from mage_ai.data_preparation.models.block.constants import BLOCK_TYPE_TO_CLASS
from mage_ai.data_preparation.models.block.integration import (
    DestinationBlock,
    SourceBlock,
    TransformerBlock,
)
from mage_ai.data_preparation.models.block.r import RBlock
from mage_ai.data_preparation.models.block.sql import SQLBlock
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockStatus,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.widget import Widget

try:
    from mage_ai.data_preparation.models.block.dbt.block_sql import DBTBlockSQL
    from mage_ai.data_preparation.models.block.dbt.block_yaml import DBTBlockYAML
except Exception:
    print('DBT library not installed.')


class BlockFactory:
    @classmethod
    def block_class_from_type(self, block_type: str, language=None, pipeline=None) -> 'Block':
        if BlockType.CHART == block_type:
            return Widget
        elif BlockType.DBT == block_type:
            if language == BlockLanguage.YAML:
                return DBTBlockYAML
            return DBTBlockSQL
        elif pipeline and PipelineType.INTEGRATION == pipeline.type:
            if BlockType.CALLBACK == block_type:
                return CallbackBlock
            elif BlockType.CONDITIONAL == block_type:
                return ConditionalBlock
            elif BlockType.DATA_LOADER == block_type:
                return SourceBlock
            elif BlockType.DATA_EXPORTER == block_type:
                return DestinationBlock
            else:
                return TransformerBlock
        elif BlockLanguage.SQL == language:
            return SQLBlock
        elif BlockLanguage.R == language:
            return RBlock
        return BLOCK_TYPE_TO_CLASS.get(block_type)

    @classmethod
    def get_block(
        self,
        name,
        uuid,
        block_type,
        configuration=None,
        content=None,
        language=None,
        pipeline=None,
        status=BlockStatus.NOT_EXECUTED,
    ) -> 'Block':
        block_class = BlockFactory.block_class_from_type(
            block_type,
            language=language,
            pipeline=pipeline,
        ) or Block
        return block_class(
            name,
            uuid,
            block_type,
            configuration=configuration,
            content=content,
            language=language,
            pipeline=pipeline,
            status=status,
        )
