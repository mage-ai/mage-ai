{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.algolia import Algolia
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_algolia(*args, **kwargs):
    """
    Template for loading data from Algolia.
    """
    query_texts = 'Query texts'
    # Overwrite index name if you want
    index_name = 'new index name'
    # Columns to fetch
    column_names = ['firstname', 'lastname', 'ObjectId']

    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    return Algolia.with_config(ConfigFileLoader(config_path, config_profile)).load(
        query_texts=query_texts,
        index_name=index_name,
        column_names=column_names)
{% endblock %}
