from jinja2 import Template
from mage_ai.shared.dates import n_days_ago
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
