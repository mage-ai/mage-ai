{% extends "data_exporters/default.jinja" %}
{% block imports %}
from typing import Dict, List, Tuple, Union

import numpy as np
from elasticsearch import Elasticsearch

{{ super() -}}
{% endblock %}

{% block content %}
@data_exporter
def elasticsearch(
    documents: List[Dict[str, Union[Dict, List[int], np.ndarray, str]]], *args, **kwargs,
):
    """
    Exports document data to an Elasticsearch database.
    """

    connection_string = kwargs.get('connection_string', 'http://localhost:9200')
    index_name = kwargs.get('index_name', 'documents')
    number_of_shards = kwargs.get('number_of_shards', 1)
    number_of_replicas = kwargs.get('number_of_replicas', 0)
    vector_column_name = kwargs.get('vector_column_name', 'embedding')

    dimensions = kwargs.get('dimensions')
    if dimensions is None and len(documents) > 0:
        document = documents[0]
        dimensions = len(document.get(vector_column_name) or [])

    es_client = Elasticsearch(connection_string)

    print(f'Connecting to Elasticsearch at {connection_string}')

    index_settings = dict(
        settings=dict(
            number_of_shards=number_of_shards,
            number_of_replicas=number_of_replicas,
        ),
        mappings=dict(
            properties=dict(
                chunk=dict(type='text'),
                document_id=dict(type='text'),
                embedding=dict(type='dense_vector', dims=dimensions),
            ),
        ),
    )

    if not es_client.indices.exists(index=index_name):
        es_client.indices.create(index=index_name)
        print('Index created with properties:', index_settings)
        print('Embedding dimensions:', dimensions)

    print(f'Indexing {len(documents)} documents to Elasticsearch index {index_name}')
    for document in documents:
        print(f'Indexing document {document["document_id"]}')

        if isinstance(document[vector_column_name], np.ndarray):
            document[vector_column_name] = document[vector_column_name].tolist()

        es_client.index(index=index_name, document=document)
{% endblock %}
