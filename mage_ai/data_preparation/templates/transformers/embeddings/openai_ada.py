{% extends "transformers/default.jinja" %}
{% block imports %}
import openai
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def openai_ada(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    OpenAI's text-embedding-ada-002 model is a popular choice for creating embeddings.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    model_name = kwargs['model_name']
    api_key = kwargs['api_key']
    max_length = kwargs.get('max_length', 2048)

    openai.api_key = api_key
    response = openai.Embedding.create(model=model_name, input=[' '.join(tokens)])
    embeddings = response['data'][0]['embedding']

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
