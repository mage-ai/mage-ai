{% extends "transformers/default.jinja" %}
{% block imports %}
from typing import List, Tuple

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def sliding_window_chunker(document_data: Tuple[str, str], *args, **kwargs) -> List[Tuple[str, str, str]]:
    """
    Template for sliding window chunking of a document.

    Args:
        document_data (Tuple[str, str]): Tuple containing document_id and document_content.
        window_size (int, optional): The size of the window to chunk from kwargs.
        stride (int, optional): The stride length to move the window from kwargs.

    Returns:
        List[Tuple[str, str, str]]: List of tuples containing document_id, document_content, and chunk_text.
    """
    document_id, document_content = document_data
    window_size = kwargs.get('window_size', 1000)  # Default window size
    stride = kwargs.get('stride', 500)  # Default stride length

    chunks = []

    for i in range(0, len(document_content) - window_size + 1, stride):
        chunk = document_content[i:i+window_size]
        chunks.append((document_id, document_content, chunk))

    return chunks
{% endblock %}
