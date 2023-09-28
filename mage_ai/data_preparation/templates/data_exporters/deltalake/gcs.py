{% extends 'data_exporters/deltalake/default.jinja' %}
{% block storage_options %}
    storage_options = {
        'GOOGLE_SERVICE_ACCOUNT': '',
        'GOOGLE_SERVICE_ACCOUNT_PATH': '',
        'GOOGLE_SERVICE_ACCOUNT_KEY': '',
        'GOOGLE_BUCKET': '',
    }
{% endblock %}

{% block uri %}
    uri = 'gs://[bucket]/[key]'
{% endblock %}
