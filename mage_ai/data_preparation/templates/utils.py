import jinja2
import os
import stat
import shutil

from typing import Dict

from mage_ai.shared.io import chmod

template_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    lstrip_blocks=True,
    trim_blocks=True,
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
    chmod(dest_path, stat.S_IRWXU)


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
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)

    with open(dest_path, 'w') as foutput:
        foutput.write(template_source)


def template_exists(template_path: str) -> bool:
    """
    Check whether a template exists

    Args:
        template_path (str): File path of template to check

    Returns:
        (bool) Returns true if the template exists, otherwise returns false
    """
    template_path = os.path.join(
        os.path.dirname(__file__),
        template_path,
    )
    return os.path.exists(template_path)


def get_variable_for_template(
    variable_uuid: str,
    parse: str = None,
    variables: Dict = None,
):
    if not variables:
        return None

    value = variables.get(variable_uuid)
    if parse:
        results = {}
        exec(f'_parse_func = {parse}', results)
        return results['_parse_func'](value)

    return value
