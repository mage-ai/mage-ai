{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from gensim.models import FastText
from typing import List, Tuple, Union

nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def fasttext(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Extend Word2Vec by considering subword information, which helps in handling out-of-vocabulary words.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    embedding_size = kwargs['embedding_size']
    window = kwargs.get('window', 5)
    min_count = kwargs.get('min_count', 1)
    epochs = kwargs.get('epochs', 5)

    model = FastText(vector_size=embedding_size, window=window, min_count=min_count)
    model.build_vocab([tokens])
    model.train([tokens], total_examples=model.corpus_count, epochs=epochs)
    embeddings = [model.wv[word] for word in tokens]

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
