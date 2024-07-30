{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from typing import List, Tuple

nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def token_chunker(document_data: Tuple[str, str], *args, **kwargs) -> List[Tuple[str, str, str]]:
    """
    Template for token-based chunking of a document.

    Args:
        document_data (Tuple[str, str]): Tuple containing document_id and document_content.
        max_tokens (int, optional): Maximum number of tokens per chunk from kwargs.

    Returns:
        List[Tuple[str, str, str]]: List of tuples containing document_id, document_content, and chunk_text.
    """
    document_id, document_content = document_data
    max_tokens = kwargs.get('max_tokens', 100)  # Default token length
    tokens = nltk.word_tokenize(document_content)
    chunks = []

    for i in range(0, len(tokens), max_tokens):
        chunk = ' '.join(tokens[i:i+max_tokens])
        chunks.append((document_id, document_content, chunk))

    return chunks
{% endblock %}
