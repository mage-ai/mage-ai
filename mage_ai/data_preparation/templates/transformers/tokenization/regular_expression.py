{% extends "transformers/default.jinja" %}
{% block imports %}
import re
from typing import List, Tuple
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def regex_tokenizer(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[str]]:
    """
    Tokenize text using custom regular expressions for more flexible tokenization.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[str]]: Tuple containing document_id, document_content, chunk, and tokens.
    """
    document_id, document_content, chunk = document_data
    pattern = kwargs['pattern']
    flags = kwargs.get('flags', "i")
    split_on_whitespace = kwargs.get('split_on_whitespace', True)

    regex_flags = 0
    if 'i' in flags:
        regex_flags |= re.IGNORECASE

    tokens = re.findall(pattern, chunk, flags=regex_flags)

    if split_on_whitespace:
        chunk_tokens = re.split(r'\s+', chunk)
        tokens.extend(chunk_tokens)

    return document_id, document_content, chunk, tokens
{% endblock %}
