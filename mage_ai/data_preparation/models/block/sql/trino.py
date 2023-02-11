from mage_ai.data_preparation.models.block.sql.utils.shared import (
    interpolate_input,
    should_cache_data_from_upstream,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.variable_manager import get_variable
from mage_ai.io.config import ConfigKey
from pandas import DataFrame
from typing import Dict


def create_upstream_block_tables(
    loader,
    block,
    cascade_on_drop: bool = False,
    configuration: Dict = None,
    execution_partition: str = None,
    cache_upstream_dbt_models: bool = False,
):
    from mage_ai.data_preparation.models.block.dbt.utils import (
        parse_attributes,
        source_table_name_for_block,
    )
    configuration = configuration if configuration else block.configuration

    for idx, upstream_block in enumerate(block.upstream_blocks):
        if should_cache_data_from_upstream(block, upstream_block, [
            'data_provider',
        ], [
            ConfigKey.TRINO_CATALOG,
            ConfigKey.TRINO_SCHEMA,
            ConfigKey.TRINO_HOST,
            ConfigKey.TRINO_PORT,
        ]):
            if BlockType.DBT == upstream_block.type \
                    and not cache_upstream_dbt_models:
                continue

            table_name = upstream_block.table_name

            df = get_variable(
                upstream_block.pipeline.uuid,
                upstream_block.uuid,
                'output_0',
                partition=execution_partition,
            )

            if type(df) is DataFrame:
                if len(df.index) == 0:
                    continue
            elif type(df) is dict and len(df) == 0:
                continue
            elif type(df) is list and len(df) == 0:
                continue
            elif not df:
                continue

            schema_name = configuration.get('data_provider_schema')
            catalog_name = configuration.get('data_provider_database')

            if BlockType.DBT == block.type \
                    and BlockType.DBT != upstream_block.type:
                attributes_dict = parse_attributes(block)
                schema_name = attributes_dict['source_name']
                table_name = source_table_name_for_block(upstream_block)

            full_table_name = table_name
            if schema_name:
                full_table_name = \
                    f'{catalog_name}.{schema_name}.{full_table_name}'

            print(f'\n\nExporting data from upstream block {upstream_block.uuid} '
                  f'to {full_table_name}.')

            loader.export(
                df,
                table_name=table_name,
                schema_name=schema_name,
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
        lambda db, schema, tn: f'{db}.{schema}.{tn}',
    )
