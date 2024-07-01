{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from typing import List, Tuple

nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def sentence_chunker(document_data: Tuple[str, str], *args, **kwargs) -> List[Tuple[str, str, str]]:
    """
    Template for sentence-based chunking of a document.

    Args:
        document_data (Tuple[str, str]): Tuple containing document_id and document_content.

    Returns:
        List[Tuple[str, str, str]]: List of tuples containing document_id, document_content, and chunk_text.
    """
    document_id, document_content = document_data
    sentences = nltk.sent_tokenize(document_content)
    chunks = [(document_id, document_content, sentence) for sentence in sentences]

    return chunks
{% endblock %}
