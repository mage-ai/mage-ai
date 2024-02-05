import re
from typing import List

import inflection


def camel_to_snake_case(name):
    name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    name = re.sub('__([A-Z])', r'_\1', name)
    name = re.sub('([a-z0-9])([A-Z])', r'\1_\2', name)
    return name.lower()


def classify(name):
    return ''.join([n.capitalize() for n in name.split('_')])


def format_enum(v):
    return v.value if type(v) is not str else v


def is_number(s) -> bool:
    if s is None:
        return False

    try:
        float(s)
        return True
    except (ValueError, TypeError):
        return False


def replacer(s, newstring, index, nofail=False):
    # raise an error if index is outside of the string
    if not nofail and index not in range(len(s)):
        raise ValueError('index outside given string')

    # if not erroring, but the index is still not in the correct range..
    if index < 0:  # add it to the beginning
        return newstring + s
    if index > len(s):  # add it to the end
        return s + newstring

    # insert the new string between 'slices' of the original
    return s[:index] + newstring + s[index + 1:]


def remove_extension_from_filename(filename: str) -> str:
    parts = filename.split('/')
    fn = parts[-1].split('.')[0]
    return '/'.join(parts[:-1] + [fn])


def singularize(word: str) -> str:
    return inflection.singularize(word)


def capitalize_remove_underscore_lower(word: str) -> str:
    return word.replace('_', ' ').lower().capitalize()


def to_ordinal_integers(word: str) -> List[int]:
    if not word:
        return []

    return [ord(char) - 96 for char in word]


def size_of_string(string: str) -> float:
    return len(str(string).encode('utf-8'))
