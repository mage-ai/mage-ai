{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.qdrant import Qdrant
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_qdrant(*args, **kwargs):
    """
    Template for loading data from Qdrant.
    """
    # vector used to query qdrant.
    query_vector = [0.1, 0.2, 0.3, 0.4, 0.5, -0.6]
    # number of results to return.
    limit_results = 3
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    return Qdrant.with_config(ConfigFileLoader(config_path, config_profile)).load(
        limit_results=limit_results,
        query_vector=query_vector,
        collection_name='test_collection')
{% endblock %}
