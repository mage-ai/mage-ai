import pandas as pd


def format_value(value):
    if type(value) is not list and (value is None or pd.isnull(value)):
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
    else:
        value = escape_quotes(str(value))

    return f"'{value}'"


def escape_quotes(line: str, single: bool = True, double: bool = True) -> str:
    new_line = str(line)
    if single:
        new_line = new_line.replace("'", "''")
    if double:
        new_line = new_line.replace('\"', '\\"')
    return new_line


def map_json_to_airtable(data_types):
    # Extract the non-null type (ignoring 'null')
    data_type = next((t for t in data_types if t != 'null'), 'string')

    # Mapping from JSON types to Airtable types
    type_mapping = {
        'string': 'multilineText',
        'integer': 'number',
        'boolean': 'checkbox',
        'array': 'multipleSelects',
        'object': 'singleCollaborator',
        'number': 'number',
        'date-time': 'dateTime'
    }

    return type_mapping.get(data_type, 'str')
