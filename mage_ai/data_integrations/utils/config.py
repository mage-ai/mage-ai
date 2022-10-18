from jinja2 import Template
from mage_ai.shared.parsers import encode_complex
from typing import Dict
import os
import simplejson
import yaml


def build_config_json(
    absolute_file_path: str,
    variables: Dict,
) -> str:
    return simplejson.dumps(
        interpolate_variables_for_block_settings(
            absolute_file_path,
            variables,
        )['config'],
        default=encode_complex,
        ignore_nan=True,
    )


def interpolate_variables_for_block_settings(
    absolute_file_path: str,
    variables: Dict,
) -> Dict:
    with open(absolute_file_path, 'r') as f:
        settings_string = Template(f.read()).render(
            env_var=os.getenv,
            variables=lambda x: variables.get(x),
        )

        return yaml.full_load(settings_string)
