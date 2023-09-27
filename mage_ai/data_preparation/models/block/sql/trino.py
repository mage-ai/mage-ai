from typing import Dict, List

from pandas import DataFrame

from mage_ai.data_preparation.models.block.sql.utils.shared import (
    blocks_in_query,
    interpolate_input,
    should_cache_data_from_upstream,
    table_name_parts,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.variable_manager import get_variable
from mage_ai.io.config import ConfigKey


def create_upstream_block_tables(
    loader,
    block,
    cascade_on_drop: bool = False,
    configuration: Dict = None,
    execution_partition: str = None,
    cache_upstream_dbt_models: bool = False,
    query: str = None,
    unique_table_name_suffix: str = None,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
    variables: Dict = None,
):
    configuration = configuration if configuration else block.configuration
    database_default = configuration.get('data_provider_database') or loader.default_database()
    schema_default = configuration.get('data_provider_schema') or loader.default_schema()

    input_vars, kwargs_vars, upstream_block_uuids = block.fetch_input_variables(
        None,
        execution_partition,
        None,
        dynamic_block_index=dynamic_block_index,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
    )

    mapping = blocks_in_query(block, query)
    for idx, upstream_block in enumerate(block.upstream_blocks):
        if query and upstream_block.uuid not in mapping:
            continue

        should_cache = should_cache_data_from_upstream(block, upstream_block, [
            'data_provider',
        ], [
            'trino',
            ConfigKey.TRINO_CATALOG,
            ConfigKey.TRINO_HOST,
            ConfigKey.TRINO_PORT,
            ConfigKey.TRINO_SCHEMA,
        ])

        if should_cache:
            if BlockType.DBT == upstream_block.type \
                    and not cache_upstream_dbt_models:
                continue

            if input_vars and idx < len(input_vars):
                df = input_vars[idx]
            else:
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

            database_custom, schema_custom, table_name = table_name_parts(
                configuration,
                upstream_block,
                dynamic_block_index=dynamic_block_index,
            )

            database = database_custom or database_default
            schema = schema_custom or schema_default
            if unique_table_name_suffix:
                table_name = f'{table_name}_{unique_table_name_suffix}'

            full_table_name = '.'.join(list(filter(lambda x: x, [database, schema, table_name])))

            print(f'\n\nExporting data from upstream block {upstream_block.uuid} '
                  f'to {full_table_name}.')

            loader.export(
                df,
                schema,
                table_name,
                cascade_on_drop=cascade_on_drop,
                drop_table_on_replace=True,
                if_exists='replace',
                index=False,
                verbose=True,
            )


def interpolate_input_data(
    block,
    query: str,
    loader,
    unique_table_name_suffix: str = None,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
):
    def _get_table(opts):
        table_name = opts['table']
        return f'{table_name}_{unique_table_name_suffix}'

    return interpolate_input(
        block,
        query,
        get_database=lambda opts: loader.default_database(),
        get_schema=lambda opts: loader.default_schema(),
        get_table=_get_table if unique_table_name_suffix else None,
        dynamic_block_index=dynamic_block_index,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
    )
