{% extends "data_loaders/default.jinja" %}
{% block imports %}
import io
import pandas as pd
import requests
{{ super() -}}
{% endblock %}

{% block content %}
@data_loader
def load_data_from_api(**kwargs) -> DataFrame:
    """
    Template for loading data from API
    """
    url = ''

    response = requests.get(url)
    return pd.read_csv(io.StringIO(response.text), sep=',')
{% endblock %}
