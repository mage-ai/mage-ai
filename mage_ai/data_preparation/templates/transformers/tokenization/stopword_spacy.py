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
def stopword_removal_tokenizer(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[str]]:
    """
    Tokenize text and remove stopwords to keep only meaningful words using spaCy.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[str]]: Tuple containing document_id, document_content, chunk, and tokens.
    """
    document_id, document_content, chunk = document_data
    language = kwargs.get('language', 'en')
    custom_stopwords = kwargs.get('custom_stopwords', [])
    case_sensitive = kwargs.get('case_sensitive', False)

    nlp = load_spacy_model(language)

    # Process the text chunk using spaCy
    doc = nlp(chunk)

    # Create a set of stopwords
    stopwords = nlp.Defaults.stop_words
    if custom_stopwords:
        stopwords.update(custom_stopwords)

    if case_sensitive:
        filtered_tokens = [token.text for token in doc if token.text not in stopwords]
    else:
        filtered_tokens = [token.text for token in doc if token.text.lower() not in stopwords]

    return document_id, document_content, chunk, filtered_tokens
{% endblock %}
