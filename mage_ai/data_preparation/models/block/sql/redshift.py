from mage_ai.data_preparation.models.block.sql.utils.shared import (
    create_upstream_block_tables as create_upstream_block_tables_orig,
    interpolate_input,
)
from mage_ai.io.config import ConfigKey
from typing import Dict


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
            ConfigKey.REDSHIFT_CLUSTER_ID,
            ConfigKey.REDSHIFT_DBNAME,
            ConfigKey.REDSHIFT_HOST,
            ConfigKey.REDSHIFT_PORT,
            ConfigKey.REDSHIFT_SCHEMA,
        ],
        query=query,
        schema_name=loader.default_schema(),
    )


def interpolate_input_data(block, query, loader):
    return interpolate_input(
        block,
        query,
        get_database=lambda opts: loader.default_database(),
        get_schema=lambda opts: loader.default_schema(),
    )
