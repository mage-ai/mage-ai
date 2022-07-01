from jinja2 import Template
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
        suggestion (Dict): Suggestion payload generated from `BaseRule`.

    Returns:
        str: String version of Python code to execute to run this cleaning suggestion.
    """
    clean_title = suggestion['title'].lower().replace(' ', '_')
    cleaned_payload = json.dumps(suggestion['action_payload'], indent=4)
    cleaned_payload = cleaned_payload.replace('\n', '\n    ')
    source_path = os.path.join(os.path.dirname(__file__), 'transformers/suggestion_fmt.jinja')
    with open(source_path, 'r') as source:
        template = Template(source.read())
    return (
        template.render(title=clean_title, message=suggestion['message'], payload=cleaned_payload)
        + "\n"
    )
