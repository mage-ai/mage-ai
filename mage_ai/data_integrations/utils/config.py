from jinja2 import Template
from typing import Dict
import os
import yaml


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
