{% extends "transformers/default.jinja" %}
{% block imports %}
import spacy
from typing import List, Tuple
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def named_entity_recognition_tokenizer(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[str]]:
    """
    Tokenize text using Named Entity Recognition to identify and separate entities.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[str]]: Tuple containing document_id, document_content, chunk, and tokens.
    """
    document_id, document_content, chunk = document_data
    model_path = kwargs['model_path']
    entity_types = kwargs.get('entity_types', ["PERSON", "ORG", "LOCATION"])
    include_entity_tags = kwargs.get('include_entity_tags', True)

    nlp = spacy.load(model_path)
    doc = nlp(chunk)
    tokens = []

    for ent in doc.ents:
        if ent.label_ in entity_types:
            if include_entity_tags:
                tokens.append((ent.text, ent.label_))
            else:
                tokens.append(ent.text)

    return document_id, document_content, chunk, tokens
{% endblock %}
