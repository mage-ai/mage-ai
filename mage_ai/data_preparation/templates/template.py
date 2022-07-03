from mage_ai.data_cleaner.transformer_actions.constants import (
    ACTION_CODE_TYPES,
    ACTION_OPTION_TYPES,
    OUTPUT_TYPES,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_loader.base import DataSource
from typing import Mapping, Union
import jinja2
import json
import os
import shutil

template_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader('mage_ai/data_preparation/templates')
)


def build_template_from_suggestion(suggestion: Mapping) -> str:
    """
    Creates a file template from a suggestion.

    Args:
        suggestion (Mapping): Suggestion payload generated from `BaseRule`.

    Returns:
        str: String version of Python code to execute to run this cleaning suggestion.
    """
    clean_title = suggestion['title'].lower().replace(' ', '_')
    cleaned_payload = json.dumps(suggestion['action_payload'], indent=4)
    cleaned_payload = cleaned_payload.replace('\n', '\n    ')
    template = read_template_file('transformers/suggestion_fmt.jinja')
    return (
        template.render(
            title=clean_title,
            message=suggestion['message'],
            payload=cleaned_payload,
        )
        + "\n"
    )


def copy_template_directory(template_path: str, dest_path: str) -> None:
    """
    Copies a template directory structure from source to destination.

    Args:
        template_path (str): Source directory for the template to copy.
        dest_path (str): Destination directory to copy template to.

    Raises:
        IOError: Raises IOError if template could not be found.
    """
    template_path = os.path.join(
        os.path.dirname(__file__),
        template_path,
    )
    if not os.path.exists(template_path):
        raise IOError(f'Could not find templates for {template_path}.')
    shutil.copytree(template_path, dest_path)


def read_template_file(template_path: str) -> jinja2.Template:
    """
    Reads template source code into a string

    Args:
        template_path (str): File path of template to load relative to `templates` package

    Returns:
        jinja2.Template: Template source object
    """
    return template_env.get_template(template_path)


def write_template(template_source: str, dest_path: str) -> None:
    """
    Writes template source code to destination file

    Args:
        template_source (str): Template source code to write to file
        dest_path (str): Destination file to write template source code to.
    """
    with open(dest_path, 'w') as foutput:
        foutput.write(template_source)


def load_template(
    block_type: Union[BlockType, str], config: Mapping[str, str], dest_path: str
) -> None:
    template_source = fetch_template_source(block_type, config)
    write_template(template_source, dest_path)


def fetch_template_source(block_type: Union[BlockType, str], config: Mapping[str, str]) -> str:
    if block_type == BlockType.DATA_LOADER:
        template_source = __fetch_data_loader_templates(config)
    elif block_type == BlockType.TRANSFORMER:
        template_source = __fetch_transformer_templates(config)
    elif block_type == BlockType.DATA_EXPORTER:
        template_source = __fetch_data_exporter_templates(config)
    else:
        template_source = ''
    return template_source


def __fetch_data_loader_templates(config: Mapping[str, str]) -> str:
    data_source = config.get('data_source')
    try:
        _ = DataSource(data_source)
        template_path = f'data_loaders/{data_source.lower()}.py'
    except ValueError:
        template_path = 'data_loaders/default.py'

    return template_env.get_template(template_path).render() + '\n'


def __fetch_transformer_templates(config: Mapping[str, str]) -> str:
    action_type = config.get('action_type')
    axis = config.get('axis')
    suggested_action = config.get('suggested_action')

    if suggested_action:
        return build_template_from_suggestion(suggested_action)

    if action_type is not None and axis is not None:
        template = template_env.get_template('transformers/transformer_action_fmt.jinja')
        additional_params = []
        if action_type in ACTION_CODE_TYPES:
            additional_params = ['action_code=\'your_action_code\'']
        if action_type in ACTION_OPTION_TYPES:
            # TODO: Automatically generate action options from action type
            additional_params.append('action_options={\'your_action_option\': None}')
        if action_type in OUTPUT_TYPES:
            additional_params.append('outputs=[\'your_output_metadata\']')
        additional_params_str = ',\n        '.join(additional_params)
        if additional_params_str != '':
            additional_params_str = '\n        ' + additional_params_str
        return (
            template.render(action_type=action_type, axis=axis, kwargs=additional_params_str) + '\n'
        )
    else:
        return template_env.get_template('transformers/default.py').render() + '\n'


def __fetch_data_exporter_templates(config: Mapping[str, str]) -> str:
    return template_env.get_template('data_exporters/default.py').render() + '\n'
