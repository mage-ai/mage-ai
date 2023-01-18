from jinja2 import Template
from mage_ai.data_integrations.utils.parsers import NoDatesSafeLoader
from mage_ai.shared.dates import n_days_ago
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.parsers import encode_complex
from typing import Dict, List
import json
import os
import simplejson
import yaml

KEY_PATTERNS = '_patterns'
PATTERN_KEY_DESTINATION_TABLE = 'destination_table'


def get_settings(block, variables: Dict = {}, pipeline: 'Pipeline' = None) -> Dict:
    return __get_settings(block.file_path, variables, pipeline=pipeline)


def __get_settings(absolute_file_path, variables: Dict = {}, pipeline: 'Pipeline' = None) -> Dict:
    settings = interpolate_variables_for_block_settings(absolute_file_path, variables)
    settings_raw = interpolate_variables_for_block_settings(absolute_file_path, None)

    config = settings_raw['config']
    patterns = config.get(KEY_PATTERNS, {})
    destination_table_pattern = patterns.get(PATTERN_KEY_DESTINATION_TABLE)

    if 'catalog' not in settings \
        and pipeline \
        and pipeline.data_integration \
        and 'catalog' in pipeline.data_integration:
        settings['catalog'] = interpolate_variables(
            json.dumps(pipeline.data_integration['catalog']),
            variables,
        )

    if destination_table_pattern:
        for stream in settings['catalog']['streams']:
            tap_stream_id = stream['tap_stream_id']
            destination_table_init = stream.get(PATTERN_KEY_DESTINATION_TABLE)

            stream[PATTERN_KEY_DESTINATION_TABLE] = interpolate_string(
                destination_table_pattern,
                merge_dict(
                    variables,
                    {
                        'stream': tap_stream_id,
                        PATTERN_KEY_DESTINATION_TABLE: destination_table_init,
                    },
                ),
            )

    return settings


def get_catalog(block, variables: Dict = {}, pipeline: 'Pipeline' = None) -> Dict:
    return get_settings(block, variables, pipeline=pipeline)['catalog']


def get_catalog_by_stream(
    absolute_file_path,
    stream_id: str,
    variables: Dict = {},
    pipeline: 'Pipeline' = None,
) -> Dict:
    catalog = __get_settings(absolute_file_path, variables, pipeline=pipeline)['catalog']
    for stream in catalog['streams']:
        tap_stream_id = stream['tap_stream_id']
        if tap_stream_id == stream_id:
            return stream
    return None


def build_catalog_json(
    absolute_file_path: str,
    variables: Dict,
    selected_streams: List[str] = None,
    pipeline: 'Pipeline' =  None,
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


def interpolate_string(text: str, variables: Dict) -> str:
    kwargs = dict(
        env_var=os.getenv,
        variables=lambda x: variables.get(x),
        n_days_ago=n_days_ago,
    )

    try:
        from mage_ai.services.aws.secrets_manager.secrets_manager import get_secret
        kwargs['aws_secret_var'] = get_secret
    except ModuleNotFoundError:
        pass

    return Template(text).render(**kwargs)


def interpolate_variables(
    text: str,
    variables: Dict,
) -> Dict:
    settings_string = text if variables is None else interpolate_string(text, variables)

    return yaml.load(settings_string, Loader=NoDatesSafeLoader)
