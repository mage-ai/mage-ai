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
    configuration: Dict = None,
    execution_partition: str = None,
):
    configuration = configuration if configuration else block.configuration
    schema_name = configuration.get('data_provider_schema')

    for idx, upstream_block in enumerate(block.upstream_blocks):
        if should_cache_data_from_upstream(block, upstream_block, [
            'data_provider',
        ], [
            ConfigKey.REDSHIFT_DBNAME,
            ConfigKey.REDSHIFT_HOST,
            ConfigKey.REDSHIFT_PORT,
            ConfigKey.REDSHIFT_CLUSTER_ID,
        ]):
            df = get_variable(
                upstream_block.pipeline.uuid,
                upstream_block.uuid,
                'output_0',
                partition=execution_partition,
            )

            loader.export(
                df,
                upstream_block.table_name,
                if_exists='replace',
                schema=schema_name,
                verbose=False,
            )


def interpolate_input_data(block, query):
    return interpolate_input(
        block,
        query,
    )
