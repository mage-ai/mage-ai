from jinja2 import Template
from mage_ai.shared.dates import n_days_ago
from mage_ai.shared.parsers import encode_complex
from typing import Dict, List
import os
import simplejson
import yaml


def get_settings(block, variables: Dict = {}) -> Dict:
    absolute_file_path = block.file_path

    return interpolate_variables_for_block_settings(
        absolute_file_path,
        variables,
    )


def get_catalog(block, variables: Dict = {}) -> Dict:
    return get_settings(block, variables)['catalog']


def build_catalog_json(
    absolute_file_path: str,
    variables: Dict,
    selected_streams: List[str] = None,
) -> str:
    streams = []

    for stream in interpolate_variables_for_block_settings(
        absolute_file_path,
        variables,
    )['catalog']['streams']:
        tap_stream_id = stream['tap_stream_id']
        if not selected_streams or tap_stream_id in selected_streams:
            streams.append(stream)

    catalog = dict(streams=streams)

    return simplejson.dumps(
        catalog,
        default=encode_complex,
        ignore_nan=True,
    )


def build_config_json(
    absolute_file_path: str,
    variables: Dict,
    override: Dict = None,
) -> str:
    config = interpolate_variables_for_block_settings(
        absolute_file_path,
        variables,
    )['config']

    if override:
        config.update(override)

    return simplejson.dumps(
        config,
        default=encode_complex,
        ignore_nan=True,
    )


def interpolate_variables_for_block_settings(
    absolute_file_path: str,
    variables: Dict,
) -> Dict:
    with open(absolute_file_path, 'r') as f:
        return interpolate_variables(f.read(), variables)


def interpolate_variables(
    text: str,
    variables: Dict,
) -> Dict:
    settings_string = Template(text).render(
        env_var=os.getenv,
        variables=lambda x: variables.get(x),
        n_days_ago=n_days_ago,
    )

    return yaml.full_load(settings_string)
