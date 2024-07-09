{% extends "transformers/default.jinja" %}
{% block imports %}
from transformers import AutoTokenizer, AutoModel
import torch
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def domain_specific_fine_tuned(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Pre-trained models fine-tuned on domain-specific data to create better embeddings.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    base_model_name = kwargs['base_model_name']
    fine_tuning_data_path = kwargs['fine_tuning_data_path']

    tokenizer = AutoTokenizer.from_pretrained(base_model_name)
    model = AutoModel.from_pretrained(fine_tuning_data_path)

    inputs = tokenizer(' '.join(tokens), return_tensors='pt')
    with torch.no_grad():
        outputs = model(**inputs)

    embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
