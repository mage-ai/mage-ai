{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.io.file import FileIO
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_file(*args, **kwargs):
    """
    Template for loading data from filesystem.
    Load data from 1 file or multiple file directories.

    For multiple directories, use the following:
        FileIO().load(file_directories=['dir_1', 'dir_2'])

    Docs: https://docs.mage.ai/design/data-loading
    """
    filepath = 'path/to/your/file.csv'
    return FileIO().load(filepath)
{% endblock %}
