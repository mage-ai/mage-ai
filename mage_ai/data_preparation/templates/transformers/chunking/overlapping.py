{% extends "transformers/default.jinja" %}
{% block imports %}
from typing import List, Tuple

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def overlapping_chunker(document_data: Tuple[str, str], *args, **kwargs) -> List[Tuple[str, str, str]]:
    """
    Template for overlapping chunking of a document.

    Args:
        document_data (Tuple[str, str]): Tuple containing document_id and document_content.
        chunk_length (int, optional): The length of each chunk from kwargs.
        overlap (int, optional): The number of characters to overlap between chunks from kwargs.

    Returns:
        List[Tuple[str, str, str]]: List of tuples containing document_id, document_content, and chunk_text.
    """
    document_id, document_content = document_data
    chunk_length = kwargs.get('chunk_length', 1000)  # Default length
    overlap = kwargs.get('overlap', 200)  # Default overlap

    chunks = []

    for i in range(0, len(document_content), chunk_length - overlap):
        chunk = document_content[i:i+chunk_length]
        chunks.append((document_id, document_content, chunk))

    return chunks
{% endblock %}
