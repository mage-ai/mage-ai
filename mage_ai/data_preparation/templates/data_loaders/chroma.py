{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.chroma import Chroma
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_chroma(*args, **kwargs):
    """
    Template for loading data from Chroma.
    """
    query_embeddings = 'Query embeddings'
    query_texts = 'Query texts'
    n_results = 1
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    return Chroma.with_config(ConfigFileLoader(config_path, config_profile)).load(
        n_results=n_results,
        query_embeddings=query_embeddings,
        query_texts=query_texts)
{% endblock %}
