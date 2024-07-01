{% extends "transformers/default.jinja" %}
{% block imports %}
import nltk
from typing import List, Tuple
from nltk.corpus import wordnet
from nltk.stem import WordNetLemmatizer

nltk.download('averaged_perceptron_tagger')
nltk.download('wordnet')
nltk.download('punkt')
{{ super() -}}
{% endblock %}

{% block content %}
@transformer
def lemmatization_tokenizer(document_data: Tuple[str, str, str], *args, **kwargs) -> Tuple[str, str, str, List[str]]:
    """
    Tokenize and normalize text by converting words to their base or dictionary form.

    Args:
        document_data (Tuple[str, str, str]): Tuple containing document_id, document_content, and chunk.
    Returns:
        Tuple[str, str, str, List[str]]: Tuple containing document_id, document_content, chunk, and tokens.
    """

    def get_wordnet_pos(treebank_tag):
        if treebank_tag.startswith('J'):
            return wordnet.ADJ
        elif treebank_tag.startswith('V'):
            return wordnet.VERB
        elif treebank_tag.startswith('N'):
            return wordnet.NOUN
        elif treebank_tag.startswith('R'):
            return wordnet.ADV
        else:
            return wordnet.NOUN

    document_id, document_content, chunk = document_data
    language = kwargs['language']
    handle_stopwords = kwargs.get('handle_stopwords', False)
    use_pos_tags = kwargs.get('use_pos_tags', True)

    lemmatizer = WordNetLemmatizer()
    tokens = nltk.word_tokenize(chunk)
    pos_tags = nltk.pos_tag(tokens)

    lemmas = []
    for token, pos in pos_tags:
        wordnet_pos = get_wordnet_pos(pos) if use_pos_tags else wordnet.NOUN
        lemma = lemmatizer.lemmatize(token, pos=wordnet_pos)
        lemmas.append(lemma)

    if handle_stopwords:
        stopwords = nltk.corpus.stopwords.words(language)
        lemmas = [lemma for lemma in lemmas if lemma.lower() not in stopwords]

    return document_id, document_content, chunk, lemmas
{% endblock %}
