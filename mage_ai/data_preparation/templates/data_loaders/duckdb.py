{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.duckdb import DuckDB
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_duckdb(*args, **kwargs):
    """
    Template for loading data from DuckDB database.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://docs.mage.ai/design/data-loading#duckdb
    """
    query = 'Your SQL query'  # Specify your SQL query here
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    with DuckDB.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        return loader.load(query)
{% endblock %}
