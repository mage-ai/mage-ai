from jinja2 import Template
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.variable_manager import get_variable
from mage_ai.io.config import ConfigFileLoader
from os import path
from pandas import DataFrame
from typing import Dict, List, Tuple
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
            '{}[ ]*df_{}[ ]*{}'.format(r'\{\{', idx + 1, r'\}\}'),
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


def create_upstream_block_tables(
    loader,
    block,
    cascade_on_drop: bool = False,
    configuration: Dict = None,
    execution_partition: str = None,
    cache_upstream_dbt_models: bool = False,
    cache_keys: List[str] = [],
    no_schema: bool = False,
):
    from mage_ai.data_preparation.models.block.dbt.utils import (
        parse_attributes,
        source_table_name_for_block,
    )
    configuration = configuration if configuration else block.configuration

    for idx, upstream_block in enumerate(block.upstream_blocks):
        if should_cache_data_from_upstream(block, upstream_block, [
            'data_provider',
        ], cache_keys):
            if BlockType.DBT == upstream_block.type and not cache_upstream_dbt_models:
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

            if no_schema:
                schema_name = None
            else:
                schema_name = configuration.get('data_provider_schema')

            if BlockType.DBT == block.type and BlockType.DBT != upstream_block.type:
                if not no_schema:
                    attributes_dict = parse_attributes(block)
                    schema_name = attributes_dict['source_name']
                table_name = source_table_name_for_block(upstream_block)

            full_table_name = table_name
            if schema_name:
                full_table_name = f'{schema_name}.{full_table_name}'

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


def extract_and_replace_text_between_strings(
    text: str,
    start_string: str,
    end_string: str = None,
    replace_string: str = '',
    case_sensitive: bool = True,
) -> Tuple[str, str]:
    start_match = re.search(start_string, text, re.NOFLAG if not case_sensitive else re.IGNORECASE)
    if end_string:
        end_match = re.search(end_string, text, re.NOFLAG if not case_sensitive else re.IGNORECASE)
    else:
        end_match = None

    if not start_match or (end_string and not end_match):
        return None, text

    start_idx = start_match.span()[0]
    if end_string and end_match:
        end_idx = end_match.span()[1]

    extracted_text = text[start_idx:end_idx]

    new_text = text[0:max(start_idx - 1, 0)] + replace_string + text[end_idx + 1:]

    return extracted_text, new_text
