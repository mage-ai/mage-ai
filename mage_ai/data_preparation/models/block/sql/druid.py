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
            ConfigKey.DRUID_HOST,
            ConfigKey.DRUID_PASSWORD,
            ConfigKey.DRUID_PATH,
            ConfigKey.DRUID_PORT,
            ConfigKey.DRUID_SCHEME,
            ConfigKey.DRUID_USER,
        ],
        query=query,
        no_schema=True,
    )


def interpolate_input_data(block, query):
    return interpolate_input(
        block,
        query,
        lambda db, schema, tn: tn,
    )
