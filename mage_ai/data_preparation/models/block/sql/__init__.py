from mage_ai.data_preparation.models.block.sql import postgres
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.base import DataSource
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.postgres import Postgres
from os import path


def execute_sql_code(block, query):
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = block.configuration.get('data_provider_profile')
    config_file_loader = ConfigFileLoader(config_path, config_profile)
    schema_name = block.configuration.get('data_provider_schema')

    if DataSource.POSTGRES.value == block.configuration.get('data_provider'):
        with Postgres.with_config(config_file_loader) as loader:
            postgres.create_upstream_block_tables(loader, block)
            loader.export(
                None,
                schema_name,
                block.table_name,
                drop_table_on_replace=True,
                if_exists='replace',
                index=False,
                query_string=postgres.interpolate_input_data(block, query),
                verbose=BlockType.DATA_EXPORTER == block.type,
            )

            if BlockType.DATA_LOADER == block.type or BlockType.TRANSFORMER == block.type:
                return [loader.load(f'SELECT * FROM {schema_name}.{block.table_name}')]
