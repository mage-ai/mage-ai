{% extends "transformers/default.jinja" %}
{% block imports %}
from typing import List, Tuple
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def subword_tokenizer(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[str]]:
    """
    Tokenize text into subword units using a specified subword model.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[str]]: Tuple containing document_id, document_content, chunk, and tokens.
    """
    document_id, document_content, chunk = document_data
    model_path = kwargs['model_path']
    max_subwords = kwargs.get('max_subwords', 5)
    handle_oov = kwargs.get('handle_oov', "split")

    # Assuming a hypothetical library `subword_tokenizer` is used here.
    # You would replace this with actual subword tokenization logic.
    from subword_tokenizer import SubwordTokenizer

    tokenizer = SubwordTokenizer(model_path=model_path, max_subwords=max_subwords, handle_oov=handle_oov)
    tokens = tokenizer.encode(chunk)

    return document_id, document_content, chunk, tokens
{% endblock %}
