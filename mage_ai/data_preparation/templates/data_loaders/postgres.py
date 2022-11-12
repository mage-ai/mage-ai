{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.postgres import Postgres
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_postgres(*args, **kwargs):
    """
    Template for loading data from a PostgreSQL database.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/blocks/data_loading.md#postgresql
    """
    query = 'your PostgreSQL query'  # Specify your SQL query here
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    with Postgres.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        return loader.load(query)
{% endblock %}
