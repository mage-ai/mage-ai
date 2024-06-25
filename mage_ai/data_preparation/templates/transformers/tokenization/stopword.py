{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from typing import List, Tuple

nltk.download('punkt')
nltk.download('stopwords')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def stopword_removal_tokenizer(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[str]]:
    """
    Tokenize text and remove stopwords to keep only meaningful words.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[str]]: Tuple containing document_id, document_content, chunk, and tokens.
    """
    document_id, document_content, chunk = document_data
    language = kwargs['language']
    custom_stopwords = kwargs.get('custom_stopwords', [])
    case_sensitive = kwargs.get('case_sensitive', False)

    stopwords = set(nltk.corpus.stopwords.words(language))
    if custom_stopwords:
        stopwords.update(custom_stopwords)

    tokens = nltk.word_tokenize(chunk)

    if case_sensitive:
        filtered_tokens = [token for token in tokens if token not in stopwords]
    else:
        filtered_tokens = [token for token in tokens if token.lower() not in stopwords]

    return document_id, document_content, chunk, filtered_tokens
{% endblock %}
