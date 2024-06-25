{% extends "data_loaders/default.jinja" %}
{% block imports %}
import requests
from urllib.parse import urljoin

{{ super() -}}
{% endblock %}

{% block content %}
@data_loader
def ingest_github_files(*args, **kwargs):
    """
    Template for loading data from a GitHub repository.
    Fetch documents from a GitHub repository.

    Args:
        *args: Variable length argument list.
        **kwargs: Arbitrary keyword arguments.

    Keyword Args:
        repo_url (str): URL to the GitHub repository.
        branch (str): Branch name. Default is 'main'.
        path (str): Path to the directory or file within the repository.
        file_extension (str): File extension to filter by (e.g., '.txt').

    Yields:
        str: Content of each file.
    """
    repo_url = kwargs.get('repo_url') or ''
    branch = kwargs.get('branch') or 'main'
    path = kwargs.get('path') or ''
    file_extension = kwargs.get('file_extension')

    if not repo_url:
        raise ValueError("The 'repo_url' keyword argument is required.")

    api_url = urljoin(repo_url, f'/contents/{path}?ref={branch}')
    response = requests.get(api_url)
    response.raise_for_status()
    files = response.json()

    for file in files:
        if file['type'] == 'file' and (not file_extension or file['name'].endswith(file_extension)):
            file_response = requests.get(file['download_url'])
            file_response.raise_for_status()
            yield file_response.text
{% endblock %}
