{% extends 'data_exporters/default.jinja' %}
{% block imports %}
import weaviate
from weaviate.util import generate_uuid5
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@data_exporter
def weaviate(document_data: Tuple[str, str, str, List[str], List[Union[float, int]]], *args, **kwargs):
    """
    Exports document data to a Weaviate database.

    Args:
        document_data (Tuple[str, str, str, List[str], List[Union[float, int]]]):
            Tuple containing document_id, chunk_text, tokens, and embeddings.
    """
    document_id, chunk_text, _, _, embeddings = document_data
    connection_string = kwargs['connection_string']

    client = weaviate.Client(url=connection_string)

    document = {
        'document_id': document_id,
        # 'document_content': document_content,
        'chunk_text': chunk_text,
        # 'tokens': tokens,
        'embeddings': embeddings
    }

    uuid = generate_uuid5(document_id)

    client.data_object.create(document, class_name='Document', uuid=uuid)
{% endblock %}
