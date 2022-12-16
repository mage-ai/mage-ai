from datetime import datetime
import os
import re


def clean_name(name):
    for c in ['\ufeff', '\uFEFF', '"', '$', '\n', '\r', '\t']:
        name = name.replace(c, '')
    name = re.sub('\W', '_', name)

    if name and re.match('\d', name[0]):
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
        return 'DOUBLE'
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
