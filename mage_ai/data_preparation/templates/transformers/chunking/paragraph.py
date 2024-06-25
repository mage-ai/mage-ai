{% extends "transformers/default.jinja" %}
{% block imports %}
from typing import List, Tuple

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def paragraph_chunker(document_data: Tuple[str, str], *args, **kwargs) -> List[Tuple[str, str, str]]:
    """
    Template for paragraph-based chunking of a document.

    Args:
        document_data (Tuple[str, str]): Tuple containing document_id and document_content.

    Returns:
        List[Tuple[str, str, str]]: List of tuples containing document_id, document_content, and chunk_text.
    """
    document_id, document_content = document_data
    paragraphs = document_content.split('\n\n')
    chunks = [(document_id, document_content, paragraph) for paragraph in paragraphs]

    return chunks
{% endblock %}
