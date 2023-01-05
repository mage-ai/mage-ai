{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.bigquery import BigQuery
from mage_ai.io.config import ConfigFileLoader
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_big_query(*args, **kwargs):
    """
    Template for loading data from a BigQuery warehouse.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://docs.mage.ai/design/data-loading
    """
    query = 'your_gbq_query'
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    return BigQuery.with_config(ConfigFileLoader(config_path, config_profile)).load(query)
{% endblock %}
