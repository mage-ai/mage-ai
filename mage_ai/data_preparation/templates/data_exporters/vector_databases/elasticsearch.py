{% extends "data_exporters/default.jinja" %}
{% block imports %}
from elasticsearch import Elasticsearch
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@data_exporter
def elasticsearch(document_data: Tuple[str, str, str, List[str], List[Union[float, int]]], *args, **kwargs):
    """
    Exports document data to an Elasticsearch database.

    Args:
        document_data (Tuple[str, str, str, List[str], List[Union[float, int]]]):
            Tuple containing document_id, chunk_text, tokens, and embeddings.
    """
    document_id, chunk_text, _, _, embeddings = document_data
    connection_string = kwargs['connection_string']

    es = Elasticsearch([connection_string])

    # Check if the index exists, and create it with vector settings if it doesn't
    if not es.indices.exists(index="documents"):
        es.indices.create(index="documents", body={
            "settings": {
                "index": {
                    "knn": True
                }
            },
            "mappings": {
                "properties": {
                    "document_id": {"type": "keyword"},
                    # "document_content": {"type": "text"},
                    "chunk_text": {"type": "text"},
                    # "tokens": {"type": "text"},
                    "embeddings": {
                        "type": "dense_vector",
                        "dims": len(embeddings)  # Number of dimensions should match your embeddings size
                    }
                }
            }
        })

    document = {
        "document_id": document_id,
        # "document_content": document_content,
        "chunk_text": chunk_text,
        # "tokens": tokens,
        "embeddings": embeddings
    }

    es.index(index="documents", id=document_id, body=document)
{% endblock %}
