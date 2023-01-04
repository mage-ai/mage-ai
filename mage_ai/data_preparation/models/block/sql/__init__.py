from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.sql import (
    bigquery,
    postgres,
    redshift,
    snowflake,
)
from mage_ai.data_preparation.models.block.sql.utils.shared import interpolate_vars
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.base import DataSource, ExportWritePolicy
from mage_ai.io.config import ConfigFileLoader
from os import path
from time import sleep
from typing import Any, Dict, List

PREVIEWABLE_BLOCK_TYPES = [
    BlockType.DATA_EXPORTER,
    BlockType.DATA_LOADER,
    BlockType.DBT,
    BlockType.TRANSFORMER,
]


def execute_sql_code(
    block,
    query: str,
    execution_partition: str = None,
    global_vars: Dict = None,
    config_file_loader: Any = None,
    configuration: Dict = None,
):
    configuration = configuration if configuration else block.configuration

    if not config_file_loader:
        config_path = path.join(get_repo_path(), 'io_config.yaml')
        config_profile = configuration.get('data_provider_profile')
        config_file_loader = ConfigFileLoader(config_path, config_profile)

    data_provider = configuration.get('data_provider')
    database = configuration.get('data_provider_database')
    schema = configuration.get('data_provider_schema')
    export_write_policy = configuration.get('export_write_policy', ExportWritePolicy.APPEND)

    if 'execution_date' in global_vars:
        global_vars['ds'] = global_vars['execution_date'].strftime('%Y-%m-%d')

    block.set_global_vars(global_vars)

    table_name = block.table_name
    should_query = block.type in PREVIEWABLE_BLOCK_TYPES

    if DataSource.BIGQUERY.value == data_provider:
        from mage_ai.io.bigquery import BigQuery

        loader = BigQuery.with_config(config_file_loader)
        bigquery.create_upstream_block_tables(
            loader,
            block,
            configuration=configuration,
            execution_partition=execution_partition,
        )

        query_string = bigquery.interpolate_input_data(block, query)
        query_string = interpolate_vars(query_string, global_vars=global_vars)
        loader.export(
            None,
            f'{schema}.{table_name}',
            database=database,
            if_exists=export_write_policy,
            query_string=query_string,
            verbose=BlockType.DATA_EXPORTER == block.type,
        )

        if should_query:
            # An error is thrown because the table doesn’t exist until you re-run the query
            # NotFound: 404 Not found: Table database:schema.table_name was not found in location XX
            tries = 0
            while tries < 10:
                sleep(tries)
                tries += 1
                try:
                    result = loader.load(
                        f'SELECT * FROM {database}.{schema}.{table_name}',
                        verbose=False,
                    )
                    return [result]
                except Exception as err:
                    if '404' not in str(err):
                        raise err
    elif DataSource.POSTGRES.value == data_provider:
        from mage_ai.io.postgres import Postgres

        with Postgres.with_config(config_file_loader) as loader:
            postgres.create_upstream_block_tables(
                loader,
                block,
                configuration=configuration,
                execution_partition=execution_partition,
            )

            query_string = postgres.interpolate_input_data(block, query)
            query_string = interpolate_vars(query_string, global_vars=global_vars)

            loader.export(
                None,
                schema,
                table_name,
                drop_table_on_replace=True,
                if_exists=export_write_policy,
                index=False,
                query_string=query_string,
                verbose=BlockType.DATA_EXPORTER == block.type,
            )

            if should_query:
                return [
                    loader.load(
                        f'SELECT * FROM {schema}.{table_name}',
                        verbose=False,
                    ),
                ]
    elif DataSource.REDSHIFT.value == data_provider:
        from mage_ai.io.redshift import Redshift

        with Redshift.with_config(config_file_loader) as loader:
            redshift.create_upstream_block_tables(
                loader,
                block,
                configuration=configuration,
                execution_partition=execution_partition,
            )

            query_string = redshift.interpolate_input_data(block, query)
            query_string = interpolate_vars(query_string, global_vars=global_vars)
            loader.export(
                None,
                table_name,
                if_exists=export_write_policy,
                query_string=query_string,
                schema=schema,
                verbose=BlockType.DATA_EXPORTER == block.type,
            )

            if should_query:
                return [
                        loader.load(
                            f'SELECT * FROM {schema}.{table_name}',
                            verbose=False,
                        ),
                    ]
    elif DataSource.SNOWFLAKE.value == data_provider:
        from mage_ai.io.snowflake import Snowflake

        table_name = table_name.upper()
        database = database.upper()
        schema = schema.upper()

        with Snowflake.with_config(config_file_loader, database=database, schema=schema) as loader:
            snowflake.create_upstream_block_tables(
                loader,
                block,
                configuration=configuration,
                execution_partition=execution_partition,
            )

            query_string = snowflake.interpolate_input_data(block, query)
            query_string = interpolate_vars(query_string, global_vars=global_vars)
            loader.export(
                None,
                table_name,
                database,
                schema,
                if_exists=export_write_policy,
                query_string=query_string,
                verbose=BlockType.DATA_EXPORTER == block.type,
            )

            if should_query:
                return [
                    loader.load(
                        f'SELECT * FROM "{database}"."{schema}"."{table_name}"',
                        verbose=False,
                    ),
                ]

    return []


class SQLBlock(Block):
    def _execute_block(
        self,
        outputs_from_input_vars,
        custom_code=None,
        execution_partition=None,
        global_vars=None,
        **kwargs,
    ) -> List:
        return execute_sql_code(
            self,
            custom_code or self.content,
            execution_partition=execution_partition,
            global_vars=global_vars,
        )
