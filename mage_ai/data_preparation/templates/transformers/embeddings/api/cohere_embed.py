{% extends "transformers/default.jinja" %}
{% block imports %}
import cohere
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def cohere_embed(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Cohere offers powerful embedding models.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    model_name = kwargs['model_name']
    api_key = kwargs['api_key']
    max_length = kwargs.get('max_length', 512)

    co = cohere.Client(api_key)
    response = co.embed(model=model_name, texts=[' '.join(tokens)])
    embeddings = response.embeddings[0]
    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
