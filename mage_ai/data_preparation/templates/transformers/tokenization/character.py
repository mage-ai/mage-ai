{% extends "transformers/default.jinja" %}
{% block imports %}
from typing import List, Tuple
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def character_tokenizer(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[str]]:
    """
    Tokenize text into individual characters.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[str]]: Tuple containing document_id, document_content, chunk, and tokens.
    """
    document_id, document_content, chunk = document_data
    include_whitespace = kwargs.get('include_whitespace', False)

    if include_whitespace:
        tokens = list(chunk)
    else:
        tokens = list(chunk.replace(" ", ""))

    return document_id, document_content, chunk, tokens
{% endblock %}
