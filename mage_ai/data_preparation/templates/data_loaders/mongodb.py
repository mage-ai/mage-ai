{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.mongodb import MongoDB
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_from_mongodb(*args, **kwargs):
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    query = {}

    return MongoDB.with_config(ConfigFileLoader(config_path, config_profile)).load(
        query=query,
        collection='collection_name',
    )
{% endblock %}
