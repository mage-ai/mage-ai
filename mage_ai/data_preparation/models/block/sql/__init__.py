from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.sql import (
    bigquery,
    mssql,
    mysql,
    postgres,
    redshift,
    snowflake,
    trino,
)
from mage_ai.data_preparation.models.block.sql.utils.shared import (
    has_create_or_insert_statement,
    interpolate_vars,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.base import DataSource, ExportWritePolicy
from mage_ai.io.config import ConfigFileLoader
from os import path
from time import sleep
from typing import Any, Dict, List
import re

MAGE_SEMI_COLON = '__MAGE_SEMI_COLON__'
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
) -> List[Any]:
    configuration = configuration if configuration else block.configuration
    use_raw_sql = configuration.get('use_raw_sql')

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

    kwargs_shared = dict(
        drop_table_on_replace=True,
        if_exists=export_write_policy,
        index=False,
        verbose=BlockType.DATA_EXPORTER == block.type,
    )

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

        if use_raw_sql:
            return execute_raw_sql(
                loader,
                block,
                query_string,
                configuration=configuration,
                should_query=should_query,
            )
        else:
            loader.export(
                None,
                f'{schema}.{table_name}',
                database=database,
                if_exists=export_write_policy,
                query_string=query_string,
                verbose=BlockType.DATA_EXPORTER == block.type,
            )

            if should_query:
                """
                An error is thrown because the table doesn’t exist until you re-run the query
                NotFound: 404 Not found: Table database:schema.table_name
                    was not found in location XX
                """
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
    elif DataSource.MSSQL.value == data_provider:
        from mage_ai.io.mssql import MSSQL

        with MSSQL.with_config(config_file_loader) as loader:
            mssql.create_upstream_block_tables(
                loader,
                block,
                configuration=configuration,
                execution_partition=execution_partition,
            )

            query_string = mssql.interpolate_input_data(block, query)
            query_string = interpolate_vars(query_string, global_vars=global_vars)

            if use_raw_sql:
                return execute_raw_sql(
                    loader,
                    block,
                    query_string,
                    configuration=configuration,
                    should_query=should_query,
                )
            else:
                loader.export(
                    None,
                    None,
                    table_name,
                    query_string=query_string,
                    drop_table_on_replace=True,
                    if_exists=export_write_policy,
                    index=False,
                    verbose=BlockType.DATA_EXPORTER == block.type,
                )

                if should_query:
                    return [
                        loader.load(
                            f'SELECT * FROM {table_name}',
                            verbose=False,
                        ),
                    ]
    elif DataSource.MYSQL.value == data_provider:
        from mage_ai.io.mysql import MySQL

        with MySQL.with_config(config_file_loader) as loader:
            mysql.create_upstream_block_tables(
                loader,
                block,
                configuration=configuration,
                execution_partition=execution_partition,
            )

            query_string = mysql.interpolate_input_data(block, query)
            query_string = interpolate_vars(query_string, global_vars=global_vars)

            if use_raw_sql:
                return execute_raw_sql(
                    loader,
                    block,
                    query_string,
                    configuration=configuration,
                    should_query=should_query,
                )
            else:
                loader.export(
                    None,
                    None,
                    table_name,
                    query_string=query_string,
                    **kwargs_shared,
                )

                if should_query:
                    return [
                        loader.load(
                            f'SELECT * FROM {table_name}',
                            verbose=False,
                        ),
                    ]
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

            if use_raw_sql:
                return execute_raw_sql(
                    loader,
                    block,
                    query_string,
                    configuration=configuration,
                    should_query=should_query,
                )
            else:
                loader.export(
                    None,
                    schema,
                    table_name,
                    query_string=query_string,
                    **kwargs_shared,
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

            if use_raw_sql:
                return execute_raw_sql(
                    loader,
                    block,
                    query_string,
                    configuration=configuration,
                    should_query=should_query,
                )
            else:
                loader.export(
                    None,
                    table_name,
                    schema=schema,
                    query_string=query_string,
                    **kwargs_shared,
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

        table_name = table_name.upper() if table_name else table_name
        database = database.upper() if database else database
        schema = schema.upper() if schema else schema

        with Snowflake.with_config(config_file_loader, database=database, schema=schema) as loader:
            snowflake.create_upstream_block_tables(
                loader,
                block,
                configuration=configuration,
                execution_partition=execution_partition,
            )

            query_string = snowflake.interpolate_input_data(block, query)
            query_string = interpolate_vars(query_string, global_vars=global_vars)

            if use_raw_sql:
                return execute_raw_sql(
                    loader,
                    block,
                    query_string,
                    configuration=configuration,
                    should_query=should_query,
                )
            else:
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
                            database=database,
                            schema=schema,
                            table_name=table_name,
                            verbose=False,
                        ),
                    ]
    elif DataSource.TRINO.value == data_provider:
        from mage_ai.io.trino import Trino

        with Trino.with_config(config_file_loader) as loader:
            trino.create_upstream_block_tables(
                loader,
                block,
                configuration=configuration,
                execution_partition=execution_partition,
            )

            query_string = trino.interpolate_input_data(block, query)
            query_string = interpolate_vars(query_string, global_vars=global_vars)

            if use_raw_sql:
                return execute_raw_sql(
                    loader,
                    block,
                    query_string,
                    configuration=configuration,
                    should_query=should_query,
                )
            else:
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
                            database=database,
                            schema=schema,
                            table_name=table_name,
                            verbose=False,
                        ),
                    ]


def split_query_string(query_string: str) -> List[str]:
    text_parts = []

    matches = re.finditer(r"'(.*?)'|\"(.*?)\"", query_string, re.IGNORECASE)

    previous_idx = 0

    for idx, match in enumerate(matches):
        matched_string = match.group()
        updated_string = re.sub(r';', MAGE_SEMI_COLON, matched_string)

        start_idx, end_idx = match.span()

        previous_chunk = query_string[previous_idx:start_idx]
        text_parts.append(previous_chunk)
        text_parts.append(updated_string)
        previous_idx = end_idx

    text_parts.append(query_string[previous_idx:])

    text_combined = ''.join(text_parts)
    queries = text_combined.split(';')

    arr = []
    for query in queries:
        query = query.strip()
        if not query:
            continue

        lines = query.split('\n')
        query = '\n'.join(list(filter(lambda x: not x.startswith('--'), lines)))
        query = query.strip()
        query = re.sub(MAGE_SEMI_COLON, ';', query)

        if query:
            arr.append(query)

    return arr


def execute_raw_sql(
    loader,
    block: 'Block',
    query_string: str,
    configuration: Dict = {},
    should_query: bool = False,
) -> List[Any]:
    queries = []
    fetch_query_at_indexes = []

    has_create_or_insert = has_create_or_insert_statement(query_string)

    for query in split_query_string(query_string):
        if has_create_or_insert:
            queries.append(query)
            fetch_query_at_indexes.append(False)
        else:
            queries.append(query)
            fetch_query_at_indexes.append(True)

    if should_query and has_create_or_insert:
        queries.append(f'SELECT * FROM {block.full_table_name} LIMIT 1000')
        fetch_query_at_indexes.append(block.full_table_name)

    results = loader.execute_queries(
        queries,
        commit=True,
        fetch_query_at_indexes=fetch_query_at_indexes,
    )

    if should_query:
        return [results[-1]]

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
