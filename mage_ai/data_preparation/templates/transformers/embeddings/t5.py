{% extends "transformers/default.jinja" %}
{% block imports %}
from transformers import T5Tokenizer, T5Model
import torch
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def t5(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    A transformer model that converts all NLP problems into a text-to-text format, providing versatile embeddings.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    model_name = kwargs['model_name']
    max_length = kwargs.get('max_length', 128)

    tokenizer = T5Tokenizer.from_pretrained(model_name)
    model = T5Model.from_pretrained(model_name)

    inputs = tokenizer(' '.join(tokens), return_tensors='pt', max_length=max_length, truncation=True, padding='max_length')
    with torch.no_grad():
        outputs = model(**inputs)

    embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
