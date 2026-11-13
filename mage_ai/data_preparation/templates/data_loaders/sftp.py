{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.sftp import SFTP
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_from_sftp(*args, **kwargs):
    """
    Template for loading data from a remote SFTP server.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://docs.mage.ai/design/data-loading#sftp
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    remote_path = '/path/to/remote/file.csv'

    return SFTP.with_config(ConfigFileLoader(config_path, config_profile)).load(
        remote_path,
    )
{% endblock %}
