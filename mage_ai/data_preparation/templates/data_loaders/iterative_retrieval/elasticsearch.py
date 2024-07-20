{% extends "data_loaders/default.jinja" %}
{% block imports %}
from typing import List, Union

import numpy as np
from elasticsearch import Elasticsearch

{{ super() -}}
{% endblock %}

{% block content %}
@data_loader
def search(query_embedding: Union[List[int], np.ndarray], *args, **kwargs):
    connection_string = kwargs.get('connection_string', 'http://localhost:9200')
    index_name = kwargs.get('index_name', 'documents')
    source = kwargs.get('source', "cosineSimilarity(params.query_vector, 'embedding') + 1.0")
    top_k = kwargs.get('top_k', 5)

    if isinstance(query_embedding, np.ndarray):
        query_embedding = query_embedding.tolist()

    script_query = dict(
        script_score=dict(
            query=dict(match_all=dict()),
            script=dict(source=source, params=dict(query_vector=query_embedding)),
        )
    )
iterative_retrieval
    es_client = Elasticsearch(connection_string)
    response = es_client.search(
        index=index_name,
        query=dict(
            size=top_k,
            query=script_query,
            _source=['chunk'],
        ),
    )

    return [hit['_source']['content'] for hit in response['hits']['hits']]
{% endblock %}
