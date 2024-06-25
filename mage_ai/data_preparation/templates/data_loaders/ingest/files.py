{% extends "data_loaders/default.jinja" %}
{% block imports %}
import re


from mage_ai.shared.files import get_absolute_paths_from_all_files
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def ingest_files(*args, **kwargs):
    """
    Template for loading data from filesystem.
    Load data from 1 file or multiple file directories.

    Args:
        *args: Variable length argument list.
        **kwargs: Arbitrary keyword arguments.

    Keyword Args:
        path (str): Path to file directory.
        exclude_pattern (str): Exclude pattern for file paths.
        include_pattern (str): Include pattern for file paths.

    Yields:
        str: Content of each file.
    """
    path = kwargs.get('path') or ''
    exclude_pattern = kwargs.get('exclude_pattern')
    include_pattern = kwargs.get('include_pattern')

    paths = get_absolute_paths_from_all_files(
        starting_full_path_directory=path,
        comparator=lambda path: (
            not exclude_pattern or
            not re.search(exclude_pattern, path or '')
        ) and (not include_pattern or re.search(include_pattern, path or '')),
    )

    for path, _, _ in paths:
        with open(path, 'r') as file:
            yield file.read()
{% endblock %}
