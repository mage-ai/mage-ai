from mage_ai.data_preparation.models.block.sql import (
    bigquery,
    postgres,
    redshift,
    snowflake,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.base import DataSource
from mage_ai.io.bigquery import BigQuery
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.postgres import Postgres
from mage_ai.io.redshift import Redshift
from mage_ai.io.snowflake import Snowflake
from os import path
from time import sleep


def execute_sql_code(block, query):
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = block.configuration.get('data_provider_profile')
    config_file_loader = ConfigFileLoader(config_path, config_profile)

    data_provider = block.configuration.get('data_provider')
    database = block.configuration.get('data_provider_database')
    schema = block.configuration.get('data_provider_schema')
    table_name = block.table_name
    should_query = BlockType.DATA_LOADER == block.type or BlockType.TRANSFORMER == block.type

    if DataSource.BIGQUERY.value == data_provider:
        loader = BigQuery.with_config(config_file_loader)
        bigquery.create_upstream_block_tables(loader, block)

        query_string = bigquery.interpolate_input_data(block, query)
        loader.export(
            None,
            f'{schema}.{table_name}',
            database=database,
            if_exists='replace',
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
        with Postgres.with_config(config_file_loader) as loader:
            postgres.create_upstream_block_tables(loader, block)

            query_string = postgres.interpolate_input_data(block, query)
            loader.export(
                None,
                schema,
                table_name,
                drop_table_on_replace=True,
                if_exists='replace',
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
        with Redshift.with_config(config_file_loader) as loader:
            redshift.create_upstream_block_tables(loader, block)

            query_string = redshift.interpolate_input_data(block, query)
            loader.export(
                None,
                table_name,
                if_exists='replace',
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
        table_name = table_name.upper()
        database = database.upper()
        schema = schema.upper()

        with Snowflake.with_config(config_file_loader, database=database, schema=schema) as loader:
            snowflake.create_upstream_block_tables(loader, block)

            query_string = snowflake.interpolate_input_data(block, query)
            loader.export(
                None,
                table_name,
                database,
                schema,
                if_exists='replace',
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
