{% extends "data_loaders/default.jinja" %}
{% block imports %}
from typing import Dict, List, Union

import numpy as np
from elasticsearch import Elasticsearch

{{ super() -}}
{% endblock %}

{% block content %}
@data_loader
def search(query_embedding: Union[List[int], np.ndarray], *args, **kwargs) -> List[Dict]:
    connection_string = kwargs.get('connection_string', 'http://localhost:9200')
    index_name = kwargs.get('index_name', 'documents')
    source = kwargs.get('source', "cosineSimilarity(params.query_vector, 'embedding') + 1.0")
    top_k = kwargs.get('top_k', 5)
    chunk_column = kwargs.get('chunk_column', 'content')

    if isinstance(query_embedding, np.ndarray):
        query_embedding = query_embedding.tolist()

    script_query = dict(
        script_score=dict(
            query=dict(match_all=dict()),
            script=dict(source=source, params=dict(query_vector=query_embedding)),
        )
    )

    es_client = Elasticsearch(connection_string)

    response = es_client.search(
        index=index_name,
        query=dict(
            size=top_k,
            query=script_query,
            _source=[chunk_column],
        ),
    )

    return [hit['_source']['content'] for hit in response['hits']['hits']]
{% endblock %}
