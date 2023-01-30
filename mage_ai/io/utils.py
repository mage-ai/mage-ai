import pandas as pd


def format_value(value):
    if value is None or pd.isnull(value):
        return 'NULL'

    if type(value) is bool:
        if value is True:
            return 'TRUE'
        else:
            return 'FALSE'

    if type(value) is int or type(value) is float:
        return str(value)

    if type(value) is str:
        value = escape_quotes(value)

    return f"'{value}'"


def escape_quotes(line: str, single: bool = True, double: bool = True) -> str:
    new_line = str(line)
    if single:
        new_line = new_line.replace("'", "''")
    if double:
        new_line = new_line.replace('\"', '\\"')
    return new_line
