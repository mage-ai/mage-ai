{% extends "transformers/default.jinja" %}
{% block imports %}
from transformers import AutoTokenizer, AutoModel
import torch
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def embedding_truncation_compression(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Truncating embeddings to lower dimensions with minimal performance loss.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    original_model_name = kwargs['original_model_name']
    truncated_dim = kwargs['truncated_dim']

    tokenizer = AutoTokenizer.from_pretrained(original_model_name)
    model = AutoModel.from_pretrained(original_model_name)

    inputs = tokenizer(' '.join(tokens), return_tensors='pt')
    with torch.no_grad():
        outputs = model(**inputs)

    # Simulating truncation by taking the first `truncated_dim` values
    embeddings = outputs.last_hidden_state.mean(dim=1).squeeze()[:truncated_dim].tolist()

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
