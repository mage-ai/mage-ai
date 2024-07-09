{% extends "transformers/default.jinja" %}
{% block imports %}
import tensorflow_hub as hub
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def universal_sentence_encoder(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Provide embeddings for sentences or phrases, optimized for transfer learning.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    model_name = kwargs['model_name']

    embed = hub.load(model_name)
    embeddings = embed([' '.join(tokens)]).numpy().tolist()[0]

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
