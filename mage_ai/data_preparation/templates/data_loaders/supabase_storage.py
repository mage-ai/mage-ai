{% extends "data_loaders/default.jinja" %}
{% block imports %}
from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.supabase_storage import SupabaseStorage
from os import path
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_from_supabase(*args, **kwargs):
    """
    Template for loading data from supabase bucket.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://docs.mage.ai/design/data-loading#supabasestorage
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    bucket_name = 'your_bucket_name'
    object_key = 'your_object_key'

    return SupabaseStorage.with_config(ConfigFileLoader(config_path, config_profile)).load(
        bucket_name,
        object_key,
    )
{% endblock %}
