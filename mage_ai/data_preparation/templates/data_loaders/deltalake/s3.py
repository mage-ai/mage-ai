{% extends 'data_loaders/deltalake/default.jinja' %}
{% block storage_options %}
    storage_options = {
        'AWS_ACCESS_KEY_ID': '',
        'AWS_SECRET_ACCESS_KEY': '',
        'AWS_REGION': '',
        'AWS_S3_ALLOW_UNSAFE_RENAME': 'true',
    }
{% endblock %}

{% block uri %}
    uri = 's3://[bucket]/[key]'
{% endblock %}
