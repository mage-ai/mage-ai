{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from typing import List, Tuple

nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def sentence_segmenter(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[str]]:
    """
    Segment text into sentences using language-specific punctuation and rules.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[str]]: Tuple containing document_id, document_content, chunk, and sentences.
    """
    document_id, document_content, chunk = document_data
    language = kwargs['language']
    strip_whitespace = kwargs.get('strip_whitespace', True)
    sentences = nltk.sent_tokenize(chunk)

    if strip_whitespace:
        sentences = [sentence.strip() for sentence in sentences]

    return document_id, document_content, chunk, sentences
{% endblock %}
