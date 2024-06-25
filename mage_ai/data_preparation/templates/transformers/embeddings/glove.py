{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from glove import Glove
from typing import List, Tuple, Union

nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def glove(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Generate word embeddings by analyzing word co-occurrence statistics in a corpus.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    embedding_size = kwargs['embedding_size']
    window_size = kwargs.get('window_size', 15)
    iterations = kwargs.get('iterations', 100)
    min_count = kwargs.get('min_count', 5)

    model = Glove(no_components=embedding_size, learning_rate=0.05)
    model.fit([tokens], epochs=iterations, no_threads=4, window=window_size, min_count=min_count)
    model.add_dictionary({word: idx for idx, word in enumerate(tokens)})
    embeddings = [model.word_vectors[model.dictionary[word]] for word in tokens if word in model.dictionary]

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
