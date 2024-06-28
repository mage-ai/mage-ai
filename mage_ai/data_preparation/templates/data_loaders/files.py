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

    For multiple directories, use the following:
        FileIO().load(file_directories=['dir_1', 'dir_2'])

    Docs: https://docs.mage.ai/design/data-loading#fileio
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

    for path in paths:
        with open(path, 'r') as file:
            yield file.read()
{% endblock %}
