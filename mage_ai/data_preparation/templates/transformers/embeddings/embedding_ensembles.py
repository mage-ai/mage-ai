{% extends "transformers/default.jinja" %}
{% block imports %}
from transformers import AutoTokenizer, AutoModel
import torch
from typing import List, Tuple, Dict, Union

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def embedding_ensembles(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Combining multiple embedding models and aggregating their outputs.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Combined embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    model_names = kwargs['model_names']

    aggregated_embeddings = None

    for model_name in model_names:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name)

        inputs = tokenizer(' '.join(tokens), return_tensors='pt')
        with torch.no_grad():
            outputs = model(**inputs)

        embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()

        if aggregated_embeddings is None:
            aggregated_embeddings = torch.tensor(embeddings)
        else:
            aggregated_embeddings += torch.tensor(embeddings)

    aggregated_embeddings = (aggregated_embeddings / len(model_names)).tolist()

    return document_id, document_content, chunk_text, tokens, aggregated_embeddings
{% endblock %}
