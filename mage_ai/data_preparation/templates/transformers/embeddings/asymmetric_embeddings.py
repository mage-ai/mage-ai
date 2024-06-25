{% extends "transformers/default.jinja" %}
{% block imports %}
from transformers import AutoTokenizer, AutoModel
import torch
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def asymmetric_embeddings(search_document: Tuple[str, str, str, List[str]], query: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]], Tuple[str, str, str, List[str], List[Union[float, int]]]]:
    """
    Different model embeddings for search documents and queries.

    Args:
        search_document (Tuple[str, str, str, List[str]]): Search document data.
        query (Tuple[str, str, str, List[str]]): Query data.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Search document embeddings.
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Query embeddings.
    """
    search_document_id, search_document_content, search_chunk_text, search_tokens = search_document
    query_id, query_content, query_chunk_text, query_tokens = query
    search_model_name = kwargs['search_model_name']
    query_model_name = kwargs['query_model_name']

    tokenizer_search = AutoTokenizer.from_pretrained(search_model_name)
    model_search = AutoModel.from_pretrained(search_model_name)
    tokenizer_query = AutoTokenizer.from_pretrained(query_model_name)
    model_query = AutoModel.from_pretrained(query_model_name)

    inputs_search = tokenizer_search(' '.join(search_tokens), return_tensors='pt')
    inputs_query = tokenizer_query(' '.join(query_tokens), return_tensors='pt')

    with torch.no_grad():
        outputs_search = model_search(**inputs_search)
        outputs_query = model_query(**inputs_query)

    embeddings_search = outputs_search.last_hidden_state.mean(dim=1).squeeze().tolist()
    embeddings_query = outputs_query.last_hidden_state.mean(dim=1).squeeze().tolist()

    return (search_document_id, search_document_content, search_chunk_text, search_tokens, embeddings_search), (query_id, query_content, query_chunk_text, query_tokens, embeddings_query)
{% endblock %}
