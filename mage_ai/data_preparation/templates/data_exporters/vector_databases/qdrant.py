{% extends 'data_exporters/default.jinja' %}
{% block imports %}
from qdrant_client import QdrantClient
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@data_exporter
def qdrant(document_data: Tuple[str, str, str, List[str], List[Union[float, int]]], *args, **kwargs):
    """
    Exports document data to a Qdrant database.

    Args:
        document_data (Tuple[str, str, str, List[str], List[Union[float, int]]]):
            Tuple containing document_id, chunk_text, tokens, and embeddings.
    """
    document_id, chunk_text, _, _, embeddings = document_data
    connection_string = kwargs['connection_string']

    client = QdrantClient(connection_string)

    document = {
        'document_id': document_id,
        # 'document_content': document_content,
        'chunk_text': chunk_text,
        # 'tokens': tokens,
        'embeddings': embeddings
    }

    client.upload('documents', [document])
{% endblock %}
