from datetime import datetime
from os import path
from time import sleep
from typing import Any, Dict, List

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.sql import (
    bigquery,
    clickhouse,
    druid,
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
    split_query_string,
    table_name_parts_from_query,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.io.base import QUERY_ROW_LIMIT, DataSource, ExportWritePolicy
from mage_ai.io.config import ConfigFileLoader
from mage_ai.settings.repo import get_repo_path

PREVIEWABLE_BLOCK_TYPES = [
    BlockType.DATA_EXPORTER,
    BlockType.DATA_LOADER,
    BlockType.DBT,
    BlockType.TRANSFORMER,
]


def execute_sql_code(
    block,
    query: str,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
    execution_partition: str = None,
    global_vars: Dict = None,
    config_file_loader: Any = None,
    configuration: Dict = None,
    test_execution: bool = False,
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

    limit = int(configuration.get('limit') or QUERY_ROW_LIMIT)
    if test_execution:
        limit = min(limit, QUERY_ROW_LIMIT)
    else:
        limit = QUERY_ROW_LIMIT

    create_upstream_block_tables_kwargs = dict(
        configuration=configuration,
        dynamic_block_index=dynamic_block_index,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
        execution_partition=execution_partition,
        query=query,
    )

    interpolate_input_data_kwargs = dict(
        dynamic_block_index=dynamic_block_index,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
    )

    kwargs_shared = dict(
        drop_table_on_replace=True,
        if_exists=export_write_policy,
        index=False,
        verbose=BlockType.DATA_EXPORTER == block.type,
    )

    if DataSource.BIGQUERY.value == data_provider:
        from mage_ai.io.bigquery import BigQuery

        loader = BigQuery.with_config(config_file_loader)
        database = database or loader.default_database()

        bigquery.create_upstream_block_tables(
            loader,
            block,
            **create_upstream_block_tables_kwargs,
        )

        query_string = bigquery.interpolate_input_data(
            block,
            query,
            loader,
            **interpolate_input_data_kwargs,
        )
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
                total_retries = 5
                tries = 0
                while tries < total_retries:
                    sleep(tries)
                    tries += 1
                    try:
                        result = loader.load(
                            f'SELECT * FROM {database}.{schema}.{table_name}',
                            limit=limit,
                            verbose=False,
                        )
                        return [result]
                    except Exception as err:
                        if '404' not in str(err) or tries == total_retries:
                            raise err
    elif DataSource.CLICKHOUSE.value == data_provider:
        from mage_ai.io.clickhouse import ClickHouse

        loader = ClickHouse.with_config(config_file_loader)
        clickhouse.create_upstream_block_tables(
            loader,
            block,
            **create_upstream_block_tables_kwargs,
        )

        query_string = clickhouse.interpolate_input_data(
            block,
            query,
            **interpolate_input_data_kwargs,
        )
        query_string = interpolate_vars(
            query_string, global_vars=global_vars)

        database = database or 'default'

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
                table_name=table_name,
                database=database,
                query_string=query_string,
                **kwargs_shared,
            )

            if should_query:
                return [
                    loader.load(
                        f'SELECT * FROM {database}.{table_name}',
                        verbose=False,
                    ),
                ]
    elif DataSource.DRUID.value == data_provider:
        from mage_ai.io.druid import Druid

        with Druid.with_config(config_file_loader) as loader:
            druid.create_upstream_block_tables(
                loader,
                block,
                **create_upstream_block_tables_kwargs,
            )

            query_string = druid.interpolate_input_data(
                block,
                query,
                **interpolate_input_data_kwargs,
            )
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
                            limit=limit,
                            verbose=False,
                        ),
                    ]
    elif DataSource.MSSQL.value == data_provider:
        from mage_ai.io.mssql import MSSQL

        with MSSQL.with_config(config_file_loader) as loader:
            mssql.create_upstream_block_tables(
                loader,
                block,
                **create_upstream_block_tables_kwargs,
            )

            query_string = mssql.interpolate_input_data(
                block,
                query,
                **interpolate_input_data_kwargs,
            )

            schema = schema or loader.default_schema()
            query_string = interpolate_vars(query_string, global_vars=global_vars)

            if use_raw_sql:
                return mssql.execute_raw_sql(
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
                    drop_table_on_replace=True,
                    if_exists=export_write_policy,
                    index=False,
                    verbose=BlockType.DATA_EXPORTER == block.type,
                )

                if should_query:
                    return [
                        loader.load(
                            f'SELECT * FROM {table_name}',
                            limit=limit,
                            verbose=False,
                        ),
                    ]
    elif DataSource.MYSQL.value == data_provider:
        from mage_ai.io.mysql import MySQL

        with MySQL.with_config(config_file_loader) as loader:
            mysql.create_upstream_block_tables(
                loader,
                block,
                **create_upstream_block_tables_kwargs,
            )

            query_string = mysql.interpolate_input_data(
                block,
                query,
                **interpolate_input_data_kwargs,
            )
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
                            limit=limit,
                            verbose=False,
                        ),
                    ]
    elif DataSource.POSTGRES.value == data_provider:
        from mage_ai.io.postgres import Postgres

        with Postgres.with_config(config_file_loader) as loader:
            postgres.create_upstream_block_tables(
                loader,
                block,
                **create_upstream_block_tables_kwargs,
            )

            query_string = postgres.interpolate_input_data(
                block,
                query,
                loader,
                **interpolate_input_data_kwargs,
            )
            query_string = interpolate_vars(query_string, global_vars=global_vars)

            schema = schema or loader.default_schema()

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
                            limit=limit,
                            verbose=False,
                        ),
                    ]
    elif DataSource.REDSHIFT.value == data_provider:
        from mage_ai.io.redshift import Redshift

        with Redshift.with_config(config_file_loader) as loader:
            redshift.create_upstream_block_tables(
                loader,
                block,
                **create_upstream_block_tables_kwargs,
            )

            database = database or loader.default_database()
            schema = schema or loader.default_schema()

            query_string = redshift.interpolate_input_data(
                block,
                query,
                loader,
                **interpolate_input_data_kwargs,
            )
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
                                limit=limit,
                                verbose=False,
                            ),
                        ]
    elif DataSource.SNOWFLAKE.value == data_provider:
        from mage_ai.io.snowflake import Snowflake

        if not use_raw_sql:
            table_name_parts = table_name_parts_from_query(query)
            if table_name_parts is not None:
                db_from_query, schema_from_query, _ = table_name_parts
                database = db_from_query or database
                schema = schema_from_query or schema

        table_name = table_name.upper() if table_name else table_name

        with Snowflake.with_config(config_file_loader, database=database, schema=schema) as loader:
            database = database or loader.default_database()
            database = database.upper() if database else database

            schema = schema or loader.default_schema()
            schema = schema.upper() if schema else schema

            snowflake.create_upstream_block_tables(
                loader,
                block,
                **create_upstream_block_tables_kwargs,
            )

            query_string = snowflake.interpolate_input_data(
                block,
                query,
                loader,
                **interpolate_input_data_kwargs,
            )
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
                            limit=limit,
                            verbose=False,
                        ),
                    ]
    elif DataSource.TRINO.value == data_provider:
        from mage_ai.io.trino import Trino

        unique_table_name_suffix = None
        if (configuration or block.configuration).get('unique_upstream_table_name', False):
            unique_table_name_suffix = str(int(datetime.utcnow().timestamp()))

        with Trino.with_config(config_file_loader) as loader:
            database = database or loader.default_database()
            schema = schema or loader.default_schema()

            trino.create_upstream_block_tables(
                loader,
                block,
                unique_table_name_suffix=unique_table_name_suffix,
                **create_upstream_block_tables_kwargs,
            )

            query_string = trino.interpolate_input_data(
                block,
                query,
                loader,
                unique_table_name_suffix=unique_table_name_suffix,
                **interpolate_input_data_kwargs,
            )
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
                    drop_table_on_replace=True,
                    if_exists=export_write_policy,
                    query_string=query_string,
                    verbose=BlockType.DATA_EXPORTER == block.type,
                )

                if should_query:
                    names = list(filter(lambda x: x, [
                        database,
                        schema,
                        table_name,
                    ]))
                    full_table_name = '.'.join([f'"{n}"' for n in names])

                    return [
                        loader.load(
                            f'SELECT * FROM {full_table_name}',
                            limit=limit,
                            verbose=False,
                        ),
                    ]


def execute_raw_sql(
    loader,
    block: 'Block',
    query_string: str,
    configuration: Dict = None,
    should_query: bool = False,
) -> List[Any]:
    if configuration is None:
        configuration = {}
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
        dynamic_block_index: int = None,
        dynamic_upstream_block_uuids: List[str] = None,
        custom_code: str = None,
        execution_partition: str = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> List:
        if custom_code and custom_code.strip():
            query = custom_code
        else:
            query = self.content

        return execute_sql_code(
            self,
            query,
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            execution_partition=execution_partition,
            global_vars=global_vars,
            test_execution=kwargs.get('test_execution'),
        )
