from jinja2 import Template
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from os import path
from typing import List
import re


def should_cache_data_from_upstream(
    block,
    upstream_block,
    config_keys: List[str],
    config_profile_keys: List[str],
) -> bool:
    if BlockType.SENSOR == upstream_block.type:
        return False

    if BlockType.DBT == block.type:
        # TODO (tommy dang): check to see if the upstream block has the same data source
        return True

    if BlockLanguage.SQL == block.language and BlockLanguage.SQL != upstream_block.language:
        return True

    config_path = path.join(get_repo_path(), 'io_config.yaml')

    config1 = block.configuration or {}
    config2 = upstream_block.configuration or {}

    loader1 = ConfigFileLoader(config_path, config1.get('data_provider_profile'))
    loader2 = ConfigFileLoader(config_path, config2.get('data_provider_profile'))

    return not all([config1.get(k) == config2.get(k) for k in config_keys]) \
        or not all([loader1.config.get(k) == loader2.config.get(k) for k in config_profile_keys])


def interpolate_input(block, query, replace_func=None):
    def __replace_func(db, schema, tn):
        if replace_func:
            return replace_func(db, schema, tn)

        return f'{schema}.{tn}'

    for idx, upstream_block in enumerate(block.upstream_blocks):
        matcher1 = '{} df_{} {}'.format('{{', idx + 1, '}}')

        if BlockLanguage.SQL == upstream_block.type:
            configuration = upstream_block.configuration
        else:
            configuration = block.configuration

        database = configuration.get('data_provider_database', '')
        schema = configuration.get('data_provider_schema', '')

        query = re.sub(
            '{}[ ]*df_{}[ ]*{}'.format('\{\{', idx + 1, '\}\}'),
            __replace_func(database, schema, upstream_block.table_name),
            query,
        )

        query = query.replace(
            f'{matcher1}',
            __replace_func(database, schema, upstream_block.table_name),
        )

    return query


def interpolate_vars(query, global_vars=dict()):
    return Template(query).render(**global_vars)
