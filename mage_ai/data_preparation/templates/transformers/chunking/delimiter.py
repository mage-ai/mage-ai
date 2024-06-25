{% extends "transformers/default.jinja" %}
{% block imports %}
from typing import List, Tuple

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def delimiter_chunker(document_data: Tuple[str, str], *args, **kwargs) -> List[Tuple[str, str, str]]:
    """
    Template for delimiter-based chunking of a document.

    Args:
        document_data (Tuple[str, str]): Tuple containing document_id and document_content.
        delimiter (str, optional): The delimiter to use for chunking from kwargs.

    Returns:
        List[Tuple[str, str, str]]: List of tuples containing document_id, document_content, and chunk_text.
    """
    document_id, document_content = document_data
    delimiter = kwargs.get('delimiter', '\n\n')  # Default delimiter

    chunks = document_content.split(delimiter)
    chunked_data = [(document_id, document_content, chunk) for chunk in chunks]

    return chunked_data
{% endblock %}
