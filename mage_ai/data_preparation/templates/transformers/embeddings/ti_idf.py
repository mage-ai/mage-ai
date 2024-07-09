{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from typing import List, Tuple, Union

nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def tf_idf(document_data: Tuple[str, str, str, List[str]], *args, **kwargs) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Converts text into numerical representation by computing the importance of words in documents.

    Args:
        document_data (Tuple[str, str, str, List[str]]): Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]: Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    vocabulary = kwargs['vocabulary']
    max_features = kwargs.get('max_features', 5000)
    smooth_idf = kwargs.get('smooth_idf', True)

    vectorizer = TfidfVectorizer(vocabulary=vocabulary, max_features=max_features, smooth_idf=smooth_idf)
    tfidf_matrix = vectorizer.fit_transform([' '.join(tokens)])
    embeddings = tfidf_matrix.toarray().tolist()[0]  # Extract the embeddings as a list

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
