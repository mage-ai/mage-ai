{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from typing import List, Tuple

nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def word_tokenizer(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[str]]:
    """
    Tokenize text into individual words using whitespace and punctuation as delimiters.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[str]]: Tuple containing document_id, document_content, chunk, and tokens.
    """
    document_id, document_content, chunk = document_data
    language = kwargs['language']
    lower_case = kwargs.get('lower_case', True)
    tokens = nltk.word_tokenize(chunk)

    if lower_case:
        tokens = [token.lower() for token in tokens]

    return document_id, document_content, chunk, tokens
{% endblock %}
