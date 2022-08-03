{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.io.file import FileIO
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_file(**kwargs) -> DataFrame:
    """
    Template for loading data from filesystem.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/blocks/data_loading.md#fileio
    """
    filepath = 'path/to/your/file.csv'
    return FileIO().load(filepath)
{% endblock %}
