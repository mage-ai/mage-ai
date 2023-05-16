from typing import Dict

from mage_ai.data_preparation.models.block.sql.utils.shared import (
    create_upstream_block_tables as create_upstream_block_tables_orig,
)
from mage_ai.data_preparation.models.block.sql.utils.shared import interpolate_input
from mage_ai.io.config import ConfigKey


def create_upstream_block_tables(
    loader,
    block,
    cascade_on_drop: bool = False,
    configuration: Dict = None,
    execution_partition: str = None,
    cache_upstream_dbt_models: bool = False,
    query: str = None,
):
    create_upstream_block_tables_orig(
        loader,
        block,
        cascade_on_drop,
        configuration,
        execution_partition,
        cache_upstream_dbt_models,
        cache_keys=[
            ConfigKey.POSTGRES_DBNAME,
            ConfigKey.POSTGRES_HOST,
            ConfigKey.POSTGRES_PORT,
            # ConfigKey.POSTGRES_SCHEMA,
        ],
        query=query,
        schema_name=loader.default_schema(),
    )


def interpolate_input_data(block, query, loader):
    return interpolate_input(
        block,
        query,
        get_database=lambda opts: f'"{loader.default_database()}"',
        get_schema=lambda opts: loader.default_schema(),
    )
