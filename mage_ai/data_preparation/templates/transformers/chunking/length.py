{% extends "transformers/default.jinja" %}
{% block imports %}
from typing import List, Tuple

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def length_chunker(document_data: Tuple[str, str], *args, **kwargs) -> List[Tuple[str, str, str]]:
    """
    Template for chunking a document by length.

    Args:
        document_data (Tuple[str, str]): Tuple containing document_id and document_content.
        max_length (int, optional): Maximum length of each chunk from kwargs.

    Returns:
        List[Tuple[str, str, str]]: List of tuples containing document_id, document_content, and chunk_text.
    """
    document_id, document_content = document_data
    max_length = kwargs.get('max_length', 1000)  # Default max length
    chunks = []

    for i in range(0, len(document_content), max_length):
        chunk = document_content[i:i+max_length]
        chunks.append((document_id, document_content, chunk))

    return chunks
{% endblock %}
