import os
import re
import socket
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from mage_ai.shared.strings import replacer


def clean_name(
    name,
    allow_characters: List[str] = None,
    allow_number: bool = False,
    case_sensitive: bool = False,
):
    """
    Clean a name by removing unwanted characters and replacing them with underscores,
    while optionally preserving specified allowed characters and handling numbers at
    the beginning of the name.

    Args:
        name (str): The name to be cleaned.
        allow_characters (List[str], optional): List of allowed characters to preserve.
            Defaults to None.
        allow_number (bool, optional): Whether to allow numbers at the beginning of
            the name. Defaults to False.
        case_sensitive (bool, optional): Whether to preserve the case of the name.
            Defaults to False.

    Returns:
        str: The cleaned name.
    """
    if allow_characters is None:
        allow_characters = []
    # Remove unwanted characters
    for c in ['\ufeff', '\uFEFF', '"', '$', '\n', '\r', '\t']:
        name = name.replace(c, '')

    indexes_of_allowed_characters = {}
    for allowed_char in allow_characters:
        if allowed_char not in indexes_of_allowed_characters:
            indexes_of_allowed_characters[allowed_char] = []

        for idx, char in enumerate(name):
            if char == allowed_char:
                indexes_of_allowed_characters[allowed_char].append(idx)

    # Replace space with underscore
    name = re.sub(r'\W', '_', name)

    for allowed_char, indexes in indexes_of_allowed_characters.items():
        for idx in indexes:
            name = replacer(name, allowed_char, idx)

    if name and not allow_number and re.match(r'\d', name[0]):
        name = f'letter_{name}'

    # If the column name is not case sensitive, use the lower case of it
    return name.lower() if not case_sensitive else name


def files_in_path(path, verbose=0):
    files = []
    # r=root, d=directories, f = files
    for r, _, f in os.walk(path):
        for file in f:
            files.append(os.path.join(r, file))

    if verbose >= 1:
        for f in files:
            print(f)

    return files


def files_in_single_path(path):
    f = []
    # dirpath, dirnames, filenames
    for (dirpath, _, filenames) in os.walk(path):
        f.extend([os.path.join(dirpath, file) for file in filenames])
        break
    return f


def get_absolute_path(path: str) -> str:
    return str(Path(os.path.abspath(os.path.expanduser(os.path.expandvars(path)))).resolve())


def convert_pandas_dtype_to_python_type(dtype):
    dtype = str(dtype)
    if dtype in ['int64', 'integer']:
        return int
    elif 'float' in dtype:
        return float
    elif dtype in ['bool', 'boolean']:
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
    elif python_type is datetime:
        return 'TIMESTAMP'
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


def convert_python_type_to_trino_type(python_type, usr_data_types: Dict = None):
    """This method converts Python Data Type to Trino Data Type
    It also allows for the user to set TIMESTAMP precision using the
    usr_data_type dict

    Args:
        python_type: Python Data Type
        usr_data_types (dict | None): Trino settings dict containing user data type
        modifications

    Returns:
        str: Trino SQL Data Type string
    """
    if usr_data_types is None:
        usr_data_types = {}
    if python_type is int:
        return 'BIGINT'
    elif python_type is float:
        return 'DOUBLE'
    elif python_type is bool:
        return 'BOOLEAN'
    elif python_type is datetime:
        dtype = 'TIMESTAMP'
        if usr_data_types.get('timestamp_precision') is not None:
            dtype = f"{dtype}({usr_data_types.get('timestamp_precision')})"
        return dtype
    return 'VARCHAR'


def convert_python_type_to_clickhouse_type(python_type):
    if python_type is int:
        return 'Nullable(Int64)'
    elif python_type is float:
        return 'Nullable(Float64)'
    elif python_type is bool:
        return 'Nullable(Boolean)'
    elif python_type is datetime:
        return 'Nullable(Datetime64)'
    return 'Nullable(String)'


def is_port_in_use(port: int, host: str = 'localhost') -> bool:
    host = host or 'localhost'
    print(f'Checking port {port} on host {host}...')
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((host, port)) == 0


def is_spark_env():
    import importlib
    return importlib.util.find_spec('pyspark') is not None
