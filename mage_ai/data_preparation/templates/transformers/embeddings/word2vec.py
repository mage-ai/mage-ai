{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from gensim.models import Word2Vec
from typing import List, Tuple, Union

nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def word2vec(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Create word embeddings by training a neural network on a large corpus of text.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    vector_size = kwargs['vector_size']
    window = kwargs.get('window', 5)
    min_count = kwargs.get('min_count', 1)
    workers = kwargs.get('workers', 3)

    model = Word2Vec([tokens], vector_size=vector_size, window=window, min_count=min_count, workers=workers)
    embeddings = [model.wv[word] for word in tokens]  # Extracting embeddings for each token

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
