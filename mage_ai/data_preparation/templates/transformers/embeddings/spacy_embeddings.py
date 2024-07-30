{% extends "transformers/default.jinja" %}
{% block imports %}
from typing import List, Tuple, Union

import numpy as np
import spacy

{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def spacy_embeddings(
    document_data: Tuple[str, str, str, List[str]],
    *args,
    **kwargs,
) -> Tuple[str, str, str, List[str], List[Union[float, int]]]:
    """
    Generate embeddings using SpaCy models.

    Args:
        document_data (Tuple[str, str, str, List[str]]):
            Tuple containing document_id, document_content, chunk_text, and tokens.

    Returns:
        Tuple[str, str, str, List[str], List[Union[float, int]]]:
            Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, document_content, chunk_text, tokens = document_data
    model_name = kwargs['model_name']

    # Load SpaCy model
    nlp = spacy.load(model_name)

    # Combine tokens back into a single string of text used for embedding
    text = ' '.join(tokens)
    doc = nlp(text)

    # Average the word vectors in the doc to get a general embedding
    embeddings = np.mean([token.vector for token in doc], axis=0).tolist()

    return document_id, document_content, chunk_text, tokens, embeddings
{% endblock %}
