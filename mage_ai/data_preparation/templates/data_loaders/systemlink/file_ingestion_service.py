{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.systemlink import FileIngestionService
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_data_from_systemlink_fis(*args, **kwargs):
    """
    Template for loading data from File Ingestion Service
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://docs.mage.ai/design/data-loading#systemlink
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'
    file_id = kwargs['file_id']

    return FileIngestionService.with_config(ConfigFileLoader(config_path, config_profile)).load(
        file_id = file_id,
        normalize = True
    )

{% endblock %}