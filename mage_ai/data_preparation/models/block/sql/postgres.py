from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.variable_manager import get_variable
from mage_ai.data_preparation.models.block.sql.utils.shared import (
    interpolate_input,
    should_cache_data_from_upstream,
)
from mage_ai.io.config import ConfigKey
from typing import Dict


def create_upstream_block_tables(
    loader,
    block,
    cascade_on_drop: bool = False,
    configuration: Dict = None,
    execution_partition: str = None,
):
    from mage_ai.data_preparation.models.block.dbt.utils import (
        parse_attributes,
        source_table_name_for_block,
    )
    configuration = configuration if configuration else block.configuration
    schema_name = configuration.get('data_provider_schema')

    for idx, upstream_block in enumerate(block.upstream_blocks):
        if should_cache_data_from_upstream(block, upstream_block, [
            'data_provider',
        ], [
            ConfigKey.POSTGRES_DBNAME,
            ConfigKey.POSTGRES_HOST,
            ConfigKey.POSTGRES_PORT,
        ]):
            print('WTFFFFFFFFFFFFFFF', block.type, upstream_block.type, should_cache_data_from_upstream(block, upstream_block, [], []))
            table_name = upstream_block.table_name

            df = get_variable(
                upstream_block.pipeline.uuid,
                upstream_block.uuid,
                'df',
                partition=execution_partition,
            )

            if BlockType.DBT == block.type:
                attributes_dict = parse_attributes(block)
                schema_name = attributes_dict['source_name']
                table_name = source_table_name_for_block(upstream_block)

            loader.export(
                df,
                schema_name,
                table_name,
                cascade_on_drop=cascade_on_drop,
                drop_table_on_replace=True,
                if_exists='replace',
                index=False,
                verbose=False,
            )


def interpolate_input_data(block, query):
    return interpolate_input(
        block,
        query,
    )
