from typing import Dict
import json
import os
import shutil


def copy_templates(template_path: str, dest_path: str) -> None:
    template_path = os.path.join(
        os.path.dirname(__file__),
        template_path,
    )
    if not os.path.exists(template_path):
        raise IOError(f'Could not find templates for {template_path}.')
    shutil.copytree(template_path, dest_path)


def build_template_from_suggestion(suggestion: Dict) -> str:
    """
    Creates a file template from a suggestion.

    Args:
        suggestion (Dict): Input suggestion payload

    Returns:
        str: String equivalent of action template. Write this to file to get an executable python file.
    """
    clean_title = suggestion['title'].lower().replace(' ', '_')
    cleaned_payload = json.dumps(suggestion['action_payload'], indent=4)
    cleaned_payload = cleaned_payload.replace('\n', '\n    ')
    template = f"""from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame


@transformer
def {clean_title}(df: DataFrame) -> DataFrame:
    \"\"\"
    Transformer Action: {suggestion['message']}
    \"\"\"
    action = {cleaned_payload}
    return BaseAction(action).execute(df)
"""
    return template
