import json
import re
from typing import Dict, List

import dateutil.parser

from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
)
from mage_integrations.destinations.sql.utils import (
    convert_column_type as convert_column_type_orig,
)

EMOJI_PATTERN = re.compile(
    "["
    u"\U0001F600-\U0001F64F"  # emoticons
    u"\U0001F300-\U0001F5FF"  # symbols & pictographs
    u"\U0001F680-\U0001F6FF"  # transport & map symbols
    u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
    u"\U00002702-\U000027B0"  # dingbats
    u"\U000024C2-\U0001F251"  # enclosed characters
    u"\U0001f926-\U0001f937"  # woman, man, and other emojis with skin tones
    u"\U0001F1F2"             # regional indicator symbol letters A
    u"\U0001F1F4"             # regional indicator symbol letters B
    u"\U0001F620"             # angry face
    u"\u200d"                 # zero width joiner
    u"\u2640-\u2642"          # male and female symbols
    u"\u2600-\u2B55"          # weather symbols
    u"\u23cf"                 # eject button
    u"\u23e9"                 # fast forward button
    u"\u231a"                 # watch
    u"\ufe0f"                 # emoji variation selector-16
    u"\u3030"                 # wavy dash
    u"\U00002500-\U00002BEF"  # Chinese characters
    u"\U00010000-\U0010ffff"  # other characters
    u'\u00a9\u00ae\u2000-\u3300\ud83c\ud000-\udfff\ud83d\ud000-\udfff\ud83e\ud000-\udfff\uD83C-\uDBFF\uDC00-\uDFFF'     # noqa: E501
    "]+",
    flags=re.UNICODE,  # specify the unicode flag to handle unicode characters properly
)


def remove_emoji_code(v: str) -> str:
    if type(v) is str:
        v = re.sub(r'(\\ud83d(\\ud[0-f][0-f][0-f])?)|(\\ud83c\\ud[0-f][0-f][0-f])|(\\ud83e\\ud[0-f][0-f][0-f])', '', v)     # noqa: E501
        v = EMOJI_PATTERN.sub(r'', v)
    return v


def stringify_object_and_remove_emoji_code(v: str) -> str:
    if type(v) is dict or type(v) is list:
        v = json.dumps(v)
    v = remove_emoji_code(v)
    if type(v) is not str:
        v = str(v)
    return v


def replace_single_quotes_with_double(v: str) -> str:
    v = stringify_object_and_remove_emoji_code(v)
    return v.replace("'", '"')


def convert_array(value: str, column_type_dict: Dict) -> str:
    item_type_converted = column_type_dict['item_type_converted']

    value_next = []

    if 'JSON' == item_type_converted:
        if type(value) is list:
            value_next = [f"'{replace_single_quotes_with_double(v)}'" for v in value]
        else:
            value_next = [f"'{replace_single_quotes_with_double(value)}'"]

        arr_string = ', '.join([f'TO_JSON({v})' for v in value_next])

        return f'[{arr_string}]'

    if type(value) is list:
        value_next = [f"CAST('{replace_single_quotes_with_double(v)}' AS {item_type_converted})"
                      for v in value]
    else:
        value_next = \
            [f"CAST('{replace_single_quotes_with_double(value)}' AS {item_type_converted})"]

    arr_string = ', '.join([str(v) for v in value_next])

    return f'[{arr_string}]'


def convert_array_for_batch_load(value, column_type_dict: Dict) -> str:
    item_type_converted = column_type_dict['item_type_converted']

    value_next = []

    if 'JSON' == item_type_converted:
        if type(value) is list:
            value_next = [json.loads(stringify_object_and_remove_emoji_code(v)) for v in value]
        else:
            value_next = [json.loads(stringify_object_and_remove_emoji_code(value))]

        return value_next

    value_next = value
    if 'STRING' == item_type_converted:
        if type(value) is list:
            value_next = [stringify_object_and_remove_emoji_code(v) for v in value]
        else:
            value_next = [stringify_object_and_remove_emoji_code(value)]

    return value_next


def convert_column_type(
    column_type: str,
    column_settings: Dict,
    **kwargs,
) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'JSON'
    elif COLUMN_TYPE_STRING == column_type \
            and COLUMN_FORMAT_DATETIME == column_settings.get('format'):

        return 'DATETIME'
    elif COLUMN_TYPE_BOOLEAN == column_type:
        return 'BOOL'
    elif COLUMN_TYPE_INTEGER == column_type:
        return 'INT64'

    return convert_column_type_orig(column_type, column_settings, **kwargs)


def convert_column_to_type(value, column_type) -> str:
    value = value.replace("'", "\\'")
    return f"CAST('{value}' AS {column_type})"


def convert_datetime(value: str, column_type_dict: Dict) -> str:
    column_type_converted = column_type_dict['type_converted']
    parts = value.split('.')
    arr = parts
    if len(parts) >= 2:
        arr = parts[:-1]
        tz = parts[-1][:3]
        arr.append(tz)
        final_value = '.'.join(arr)
    else:
        final_value = dateutil.parser.parse(value).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]

    return convert_column_to_type(final_value, column_type_converted)


def convert_datetime_for_batch_load(value: str) -> str:
    parts = value.split('.')
    arr = parts
    if len(parts) >= 2:
        arr = parts[:-1]
        tz = parts[-1][:3]
        arr.append(tz)
        final_value = '.'.join(arr)
    else:
        final_value = value

    return dateutil.parser.parse(final_value).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]


def convert_converted_type_to_parameter_type(converted_type):
    """
    https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.query.ScalarQueryParameterType

    converted_type: one of
        'BIGINT'
        'BOOLEAN'
        'DATETIME'
        'FLOAT64'
        'JSON'
        'STRING'
        'TEXT'

        If there is a column of these types, the raw value will be used in the insert command
        instead of using a query parameter:
            'ARRAY'
            'BOOLEAN'
            'DATETIME'
            'JSON'
            'TEXT'

    Returns one of
        'BOOL'
        'DATE'
        'DATETIME'
        'FLOAT64'
        'INT64'
        'NUMERIC'
        'STRING'
        'TIMESTAMP'

    """
    if 'BIGINT' == converted_type:
        return 'INT64'

    return converted_type


def convert_json_or_string(value, column_type_dict):
    value = value.replace('\n', '\\n')

    column_type = column_type_dict['type']
    if COLUMN_TYPE_OBJECT == column_type:
        value = f"'{replace_single_quotes_with_double(value)}'"
        value = f'TO_JSON({value})'
    else:
        value = EMOJI_PATTERN.sub(r'', value)
    return value


def convert_json_or_string_for_batch_load(
    value,
    column_type_dict,
    convert_json_to_dict: bool = True,
):
    column_type = column_type_dict['type']
    if COLUMN_TYPE_OBJECT == column_type:
        value = stringify_object_and_remove_emoji_code(value)
        value = value.replace('\n', '\\n')
        if convert_json_to_dict:
            value = json.loads(value)
    elif COLUMN_TYPE_STRING == column_type:
        if type(value) is not str:
            value = str(value)
        value = value.replace('\n', '\\n')
        value = remove_emoji_code(value)
    return value


def remove_duplicate_rows(
    row_data: List[Dict],
    unique_constraints: List[str],
    logger=None,
    tags: Dict = None,
) -> List[Dict]:
    if tags is None:
        tags = {}
    if not unique_constraints or len(unique_constraints) == 0:
        return row_data

    arr = []
    mapping = {}

    for data in row_data:
        record = data['row']['record']
        values_for_unique_constraints = [str(record[col]) for col in unique_constraints]
        key = '_'.join(values_for_unique_constraints)

        non_null_values = len(list(filter(lambda x: x, record.values())))

        existing_record = mapping.get(key)
        if existing_record:
            if logger:
                logger.info(
                    f"Duplicate record found for unique constraints {', '.join(unique_constraints)}"
                    f" with values {', '.join(values_for_unique_constraints)}: {record}.",
                    tags=tags,
                )

            existing_non_null_values = existing_record['non_null_values']
            idx = existing_record['index']
            record_previous = arr[idx]
            tags.update(
                record=record,
                record_previous=record_previous,
            )

            if non_null_values > existing_non_null_values:
                if logger:
                    logger.info(
                        'Replacing previous record with duplicate record because duplicate record '
                        f'has {non_null_values} non-null values, '
                        'which is greater than or equal to the previous record '
                        f'{existing_non_null_values} non-null values.',
                        tags=tags,
                    )

                existing_record['non_null_values'] = non_null_values
                arr[idx] = data
            elif logger:
                logger.info(
                    'Skipping duplicate record because previous record has '
                    f'{existing_non_null_values} non-null values, '
                    f'which is greater than or equal to the duplicate record {non_null_values} '
                    'non-null values.',
                    tags=tags,
                )
        else:
            mapping[key] = dict(
                non_null_values=non_null_values,
                index=len(arr),
            )
            arr.append(data)

    return arr
