{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.weaviate import Weaviate
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_weaviate(*args, **kwargs):
    """
    Template to load data from Weaviate.
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'
    collection = 'Test'
    properties = ['column1', 'column2', 'column3']
    with_limit = 5
    query_text = 'test'

    return Weaviate.with_config(ConfigFileLoader(config_path, config_profile)).load(
        properties=properties,
        collection=collection,
        with_text=query_text,
        with_limit=with_limit)
{% endblock %}
