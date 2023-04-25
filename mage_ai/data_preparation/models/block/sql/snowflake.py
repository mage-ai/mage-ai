from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.variable_manager import get_variable
from mage_ai.data_preparation.models.block.sql.utils.shared import (
    blocks_in_query,
    interpolate_input,
    should_cache_data_from_upstream,
    table_name_parts,
)
from mage_ai.io.config import ConfigKey
from pandas import DataFrame
from typing import Dict


def create_upstream_block_tables(
    loader,
    block,
    configuration: Dict = None,
    execution_partition: str = None,
    cache_upstream_dbt_models: bool = False,
    query: str = None,
):
    from mage_ai.data_preparation.models.block.dbt.utils import (
        parse_attributes,
        source_table_name_for_block,
    )
    configuration = configuration if configuration else block.configuration

    database_default = (configuration.get(
        'data_provider_database',
    ) or loader.default_database()).upper()
    schema_name_default = (configuration.get(
        'data_provider_schema',
    ) or loader.default_schema()).upper()

    mapping = blocks_in_query(block, query)
    for idx, upstream_block in enumerate(block.upstream_blocks):
        if query and upstream_block.uuid not in mapping:
            continue

        if should_cache_data_from_upstream(block, upstream_block, [
            'data_provider',
        ], [
            ConfigKey.SNOWFLAKE_ACCOUNT,
            ConfigKey.SNOWFLAKE_DEFAULT_WH,
            ConfigKey.SNOWFLAKE_DEFAULT_DB,
        ]):
            if BlockType.DBT == upstream_block.type and not cache_upstream_dbt_models:
                continue

            df = get_variable(
                upstream_block.pipeline.uuid,
                upstream_block.uuid,
                'output_0',
                partition=execution_partition,
            )

            no_data = False
            if type(df) is DataFrame:
                if len(df.index) == 0:
                    no_data = True
            elif type(df) is dict and len(df) == 0:
                no_data = True
            elif type(df) is list and len(df) == 0:
                no_data = True
            elif not df:
                no_data = True

            if no_data:
                print(f'\n\nNo data in upstream block {upstream_block.uuid}.')
                continue

            database_custom, schema_name_custom, table_name = table_name_parts(
                configuration,
                upstream_block,
            )

            database = database_custom.upper() if database_custom else database_default
            schema_name = schema_name_custom.upper() if schema_name_custom else schema_name_default
            if table_name:
                table_name = table_name.upper()

            if BlockType.DBT == block.type and BlockType.DBT != upstream_block.type:
                attributes_dict = parse_attributes(block)
                schema_name = attributes_dict['source_name'].upper()
                table_name = source_table_name_for_block(upstream_block).upper()

            loader.export(
                df,
                table_name,
                database,
                schema_name,
                if_exists='replace',
                verbose=True,
            )


def interpolate_input_data(block, query, loader):
    return interpolate_input(
        block,
        query,
        lambda db, schema, tn: f'"{db.upper()}"."{schema.upper()}"."{tn.upper()}"',
        get_database=lambda opts: loader.default_database(),
        get_schema=lambda opts: loader.default_schema(),
    )
