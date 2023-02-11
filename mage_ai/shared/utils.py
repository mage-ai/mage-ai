from datetime import datetime
from mage_ai.shared.strings import replacer
from typing import List
import os
import re


def clean_name(name, allow_characters: List[str] = []):
    for c in ['\ufeff', '\uFEFF', '"', '$', '\n', '\r', '\t']:
        name = name.replace(c, '')

    indexes_of_allowed_characters = {}
    for allowed_char in allow_characters:
        if allowed_char not in indexes_of_allowed_characters:
            indexes_of_allowed_characters[allowed_char] = []

        for idx, char in enumerate(name):
            if char == allowed_char:
                indexes_of_allowed_characters[allowed_char].append(idx)

    name = re.sub(r'\W', '_', name)

    for allowed_char, indexes in indexes_of_allowed_characters.items():
        for idx in indexes:
            name = replacer(name, allowed_char, idx)

    if name and re.match(r'\d', name[0]):
        name = f'letter_{name}'
    return name.lower()


def files_in_path(path, verbose=0):
    files = []
    # r=root, d=directories, f = files
    for r, d, f in os.walk(path):
        for file in f:
            files.append(os.path.join(r, file))

    if verbose >= 1:
        for f in files:
            print(f)

    return files


def files_in_single_path(path):
    f = []
    for (dirpath, dirnames, filenames) in os.walk(path):
        f.extend([os.path.join(dirpath, file) for file in filenames])
        break
    return f


def convert_pandas_dtype_to_python_type(dtype):
    dtype = str(dtype)
    if dtype in ['int64', 'integer']:
        return int
    elif 'float' in dtype:
        return float
    elif dtype == 'bool':
        return bool
    elif 'datetime' in dtype:
        return datetime
    return str


def convert_python_type_to_redshift_type(python_type):
    if python_type is int:
        return 'BIGINT'
    elif python_type is float:
        return 'FLOAT8'
    elif python_type is bool:
        return 'BOOLEAN'
    return 'VARCHAR'


def convert_python_type_to_bigquery_type(python_type):
    if python_type is int:
        return 'INT64'
    elif python_type is float:
        return 'FLOAT64'
    elif python_type is bool:
        return 'BOOL'
    elif python_type is datetime:
        return 'DATETIME'
    return 'STRING'


def convert_python_type_to_trino_type(python_type):
    if python_type is int:
        return 'BIGINT'
    elif python_type is float:
        return 'DOUBLE'
    elif python_type is bool:
        return 'BOOLEAN'
    elif python_type is datetime:
        return 'TIMESTAMP'
    return 'VARCHAR'
