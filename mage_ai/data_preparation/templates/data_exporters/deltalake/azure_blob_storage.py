{% extends 'data_exporters/deltalake/default.jinja' %}
{% block storage_options %}
    storage_options = {
        'AZURE_STORAGE_ACCOUNT_NAME': '',
        'AZURE_STORAGE_ACCOUNT_KEY': '',
        'AZURE_STORAGE_ACCESS_KEY': '',
        'AZURE_STORAGE_MASTER_KEY': '',
        'AZURE_STORAGE_CLIENT_ID': '',
        'AZURE_STORAGE_CLIENT_SECRET': '',
        'AZURE_STORAGE_TENANT_ID': '',
        'AZURE_STORAGE_SAS_KEY': '',
        'AZURE_STORAGE_TOKEN': '',
        'AZURE_STORAGE_USE_EMULATOR': '',
    }
{% endblock %}

{% block uri %}
    uri = 'az://[container]/[key]'
{% endblock %}
