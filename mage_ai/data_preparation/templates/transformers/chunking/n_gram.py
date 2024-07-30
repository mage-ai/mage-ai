{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from typing import List, Tuple

nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def ngram_chunker(document_data: Tuple[str, str], *args, **kwargs) -> List[Tuple[str, str, str]]:
    """
    Template for n-gram chunking of a document.

    Args:
        document_data (Tuple[str, str]): Tuple containing document_id and document_content.
        n (int, optional): The 'n' in n-gram, i.e., number of words per chunk from kwargs.

    Returns:
        List[Tuple[str, str, str]]: List of tuples containing document_id, document_content, and chunk_text.
    """
    document_id, document_content = document_data
    n = kwargs.get('n', 3)  # Default n-gram length
    tokens = nltk.word_tokenize(document_content)
    chunks = []

    for i in range(len(tokens) - n + 1):
        chunk = ' '.join(tokens[i:i+n])
        chunks.append((document_id, document_content, chunk))

    return chunks
{% endblock %}
