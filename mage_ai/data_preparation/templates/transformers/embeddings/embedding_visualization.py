{% extends "transformers/default.jinja" %}
{% block imports %}
import numpy as np
from sklearn.manifold import TSNE
from umap import UMAP
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def embedding_visualization(document_data: Tuple[str, str, str, List[str], List[Union[float, int]]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Project high-dimensional embeddings into 2D/3D space.

    Args:
        document_data (Tuple[str, str, str, List[str], List[Union[float, int]]]): Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and reduced_embeddings.
    """
    document_id, document_content, chunk_text, tokens, embeddings = document_data
    method = kwargs['method']
    n_components = kwargs.get('n_components', 2)

    if method == 't-SNE':
        reducer = TSNE(n_components=n_components)
    elif method == 'UMAP':
        reducer = UMAP(n_components=n_components)
    else:
        raise ValueError(f"Unsupported method: {method}")

    reduced_embeddings = reducer.fit_transform(np.array([embeddings])).tolist()[0]

    return document_id, document_content, chunk_text, tokens, reduced_embeddings
{% endblock %}
