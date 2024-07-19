{% extends "transformers/default.jinja" %}
{% block imports %}
import spacy
from typing import List, Tuple


# Function to load the spaCy model based on the language provided in kwargs
def load_spacy_model(language: str):
    models = {
        'en': 'en_core_web_sm',
        'de': 'de_core_news_sm',
        'es': 'es_core_news_sm'
        # Add more languages and their corresponding spaCy models as needed
    }
    return spacy.load(models.get(language, 'en_core_web_sm'))  # Default to English model if not found

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def part_of_speech_tagging(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[Tuple[str, str]]]:
    """
    Perform part of speech tagging on text using spaCy.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[Tuple[str, str]]]: Tuple containing document_id, document_content, chunk, and tokens with POS tags.
    """
    document_id, document_content, chunk = document_data
    language = kwargs.get('language', 'en')
    nlp = load_spacy_model(language)

    # Process the text chunk using spaCy for part of speech tagging
    doc = nlp(chunk)
    pos_tags = [(token.text, token.pos_) for token in doc]

    return document_id, document_content, chunk, pos_tags
{% endblock %}
