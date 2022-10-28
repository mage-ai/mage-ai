from mage_ai.data_preparation.models.constants import BlockLanguage
from mage_ai.data_preparation.variable_manager import get_variable
from mage_ai.data_preparation.models.block.sql.utils.shared import (
    interpolate_input,
    should_cache_data_from_upstream,
)
from mage_ai.io.config import ConfigKey


def create_upstream_block_tables(
    loader,
    block,
    execution_partition: str = None,
):
    data_provider = block.configuration.get('data_provider')
    database = block.configuration.get('data_provider_database')
    schema = block.configuration.get('data_provider_schema')

    for idx, upstream_block in enumerate(block.upstream_blocks):
        if should_cache_data_from_upstream(block, upstream_block, [
            'data_provider',
        ], [
            ConfigKey.SNOWFLAKE_ACCOUNT,
            ConfigKey.SNOWFLAKE_DEFAULT_WH,
            ConfigKey.SNOWFLAKE_DEFAULT_DB,
        ]):

            df = get_variable(
                upstream_block.pipeline.uuid,
                upstream_block.uuid,
                'df',
                partition=execution_partition,
            )

            loader.export(
                df,
                upstream_block.table_name.upper(),
                database.upper(),
                schema.upper(),
                if_exists='replace',
                verbose=False
            )


def interpolate_input_data(block, query):
    return interpolate_input(
        block,
        query,
        lambda db, schema, tn: f'"{db.upper()}"."{schema.upper()}"."{tn.upper()}"',
    )
