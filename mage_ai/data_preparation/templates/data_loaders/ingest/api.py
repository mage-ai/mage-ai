{% extends 'data_loaders/default.jinja' %}
{% block imports %}
import requests
import json
{{ super() -}}
{% endblock %}

{% block content %}
@data_loader
def ingest_api_data(*args, **kwargs):
    """
    Template for loading data from an API.
    Fetch data from external API using the provided configurations.

    Args:
        *args: Variable length argument list.
        **kwargs: Arbitrary keyword arguments.

    Keyword Args:
        endpoint (str): API endpoint URL.
        auth_token (str): Authentication token for the API.
        method (str): HTTP method to use (GET, POST, etc.).
        timeout (int): Request timeout in seconds.

    Yields:
        dict: Parsed JSON content from API response or plain text content.
    """
    endpoint = kwargs.get('endpoint')
    auth_token = kwargs.get('auth_token')
    method = kwargs.get('method', 'GET')
    timeout = kwargs.get('timeout', 30)

    headers = {}
    if auth_token:
        headers['Authorization'] = f"Bearer {auth_token}"

    try:
        response = requests.request(
            method=method,
            url=endpoint,
            headers=headers,
            timeout=timeout
        )
        response.raise_for_status()  # Check for HTTP errors
        try:
            return response.json()  # Try to parse JSON response
        except json.JSONDecodeError:
            return response.text  # Fallback to plain text response
    except requests.RequestException as e:
        raise Exception(f'API request failed: {e}')
{% endblock %}
