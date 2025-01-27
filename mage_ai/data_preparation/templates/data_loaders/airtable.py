{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.airtable import Airtable
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_airtable(*args, **kwargs):
    """
    Template for loading data from Airtable.
    Specify your configuration settings in 'io_config.yaml'.
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    base_id = 'your_base_id'
    table_name = 'your_table_name'

    return Airtable.with_config(ConfigFileLoader(config_path, config_profile)).load(
        base_id=base_id,
        table_name=table_name
    )
{% endblock %}
