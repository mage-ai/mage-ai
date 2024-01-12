import os
from typing import Dict

import yaml
from jinja2 import Template

from mage_ai.command_center.constants import SETTINGS_FILENAME
from mage_ai.shared.io import safe_write


def load_settings(full_path: str = None) -> Dict:
    full_path = full_path or __settings_full_path()

    settings = None

    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            from mage_ai.data_preparation.shared.utils import get_template_vars_no_db

            content = Template(f.read()).render(**get_template_vars_no_db())
            settings = yaml.full_load(content) or {}

    return settings


def save_settings(settings: Dict, full_path: str = None) -> Dict:
    full_path = full_path or __settings_full_path()

    content = yaml.dump(settings)
    safe_write(full_path, content)


def __settings_full_path() -> str:
    from mage_ai.settings.repo import get_variables_dir

    variables_dir = get_variables_dir(root_project=True)
    return os.path.join(variables_dir, SETTINGS_FILENAME)
