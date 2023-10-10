import json
from typing import Dict, List, Tuple

import simplejson
import yaml
from jinja2 import Template

from mage_ai.data_integrations.utils.parsers import NoDatesSafeLoader
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.shared.dates import n_days_ago
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.parsers import encode_complex

KEY_PATTERNS = '_patterns'
PATTERN_KEY_DESTINATION_TABLE = 'destination_table'


def get_settings(block, variables: Dict = None, pipeline=None) -> Dict:
    return __get_settings(block.file_path, variables or {}, pipeline=pipeline)


def __get_settings(absolute_file_path, variables: Dict = None, pipeline=None) -> Dict:
    variables_use = variables or {}

    settings = interpolate_variables_for_block_settings(absolute_file_path, variables_use)
    settings_raw = load_yaml_file(absolute_file_path)

    config = settings_raw['config']
    patterns = config.get(KEY_PATTERNS, {})
    destination_table_pattern = patterns.get(PATTERN_KEY_DESTINATION_TABLE)

    if not settings.get('catalog') \
        and pipeline \
        and pipeline.data_integration \
            and 'catalog' in pipeline.data_integration:
        settings['catalog'] = interpolate_variables(
            json.dumps(pipeline.data_integration['catalog']),
            variables_use,
        )

    if destination_table_pattern:
        for stream in settings['catalog']['streams']:
            tap_stream_id = stream['tap_stream_id']
            destination_table_init = stream.get(PATTERN_KEY_DESTINATION_TABLE)

            stream[PATTERN_KEY_DESTINATION_TABLE] = interpolate_string(
                destination_table_pattern,
                merge_dict(
                    variables_use,
                    {
                        'stream': tap_stream_id,
                        PATTERN_KEY_DESTINATION_TABLE: destination_table_init,
                    },
                ),
            )

    return settings


def get_batch_fetch_limit(source_config: Dict):
    from mage_integrations.sources.constants import (
        BATCH_FETCH_LIMIT,
        BATCH_FETCH_LIMIT_KEY,
    )

    return source_config.get(BATCH_FETCH_LIMIT_KEY, BATCH_FETCH_LIMIT)


def get_catalog(block, variables: Dict = None, pipeline=None) -> Dict:
    return get_settings(block, variables or {}, pipeline=pipeline)['catalog']


def get_catalog_by_stream(
    absolute_file_path,
    stream_id: str,
    variables: Dict = None,
    pipeline=None,
) -> Dict:
    catalog = __get_settings(absolute_file_path, variables or {}, pipeline=pipeline)['catalog']
    for stream in catalog['streams']:
        tap_stream_id = stream['tap_stream_id']
        if tap_stream_id == stream_id:
            return stream
    return None


def build_catalog_json(
    absolute_file_path: str,
    variables: Dict,
    selected_streams: List[str] = None,
    pipeline=None,
) -> str:
    streams = []

    settings = __get_settings(absolute_file_path, variables, pipeline=pipeline)
    if 'catalog' in settings and 'streams' in settings['catalog']:
        for stream in settings['catalog']['streams']:
            tap_stream_id = stream['tap_stream_id']
            if not selected_streams or tap_stream_id in selected_streams:
                streams.append(stream)

    catalog = dict(streams=streams)

    return simplejson.dumps(
        catalog,
        default=encode_complex,
        ignore_nan=True,
    )


def build_config(
    absolute_file_path: str,
    variables: Dict,
    override: Dict = None,
    content: str = None,
) -> Tuple[Dict, str]:
    config = interpolate_variables_for_block_settings(
        absolute_file_path,
        variables,
        content=content,
    )['config']

    if override:
        config.update(override)

    return config, simplejson.dumps(
        config,
        default=encode_complex,
        ignore_nan=True,
    )


def load_yaml(text: str):
    return yaml.load(text, Loader=NoDatesSafeLoader)


def load_yaml_file(absolute_file_path: str) -> Dict:
    with open(absolute_file_path, 'r') as f:
        return load_yaml(f.read())


def interpolate_variables_for_block_settings(
    absolute_file_path: str,
    variables: Dict,
    content: str = None,
) -> Dict:
    if content:
        return interpolate_variables(content, variables)

    with open(absolute_file_path, 'r') as f:
        return interpolate_variables(f.read(), variables)


def interpolate_string(text: str, variables: Dict) -> str:
    variables = dict() if variables is None else variables
    kwargs = dict(
        variables=lambda x: variables.get(x),
        n_days_ago=n_days_ago,
        **get_template_vars(),
    )

    return Template(text).render(**kwargs)


def interpolate_variables(
    text: str,
    variables: Dict,
) -> Dict:
    settings_string = interpolate_string(text, variables)

    return load_yaml(settings_string)
