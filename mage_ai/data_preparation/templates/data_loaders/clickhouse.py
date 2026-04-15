{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.clickhouse import ClickHouse
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_clickhouse(*args, **kwargs):
    """
    Template for loading data from a ClickHouse database.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://docs.mage.ai/design/data-loading#clickhouse
    """
    query = 'your ClickHouse query'  # Specify your SQL query here
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    with ClickHouse.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        return loader.load(query)
{% endblock %}
