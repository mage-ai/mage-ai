import json
import re
import sys
from datetime import datetime

from mage_integrations.destinations.constants import (
    INTERNAL_COLUMN_CREATED_AT,
    INTERNAL_COLUMN_UPDATED_AT,
)

if sys.version_info.major == 3 and sys.version_info.minor >= 10:
    from collections.abc import MutableMapping
else:
    from collections import MutableMapping


def clean_column_name(column_name, lower_case: bool = True):
    if lower_case:
        column_name = column_name.lower()
    return re.sub('\W', '_', column_name)


def flatten_record(d, parent_key='', sep='__'):
    items = []
    for k, v in d.items():
        new_key = parent_key + sep + k if parent_key else k
        if isinstance(v, MutableMapping):
            items.extend(flatten_record(v, new_key, sep=sep).items())
        else:
            items.append((new_key, str(v) if type(v) is list else v))

    return dict(items)


def update_record_with_internal_columns(record):
    curr_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')
    record[INTERNAL_COLUMN_CREATED_AT] = curr_time
    record[INTERNAL_COLUMN_UPDATED_AT] = curr_time
    return record


def update_destination_state_bookmarks(
        absolute_path_to_destination_state: str,
        stream: str,
        bookmark_values: dict = {}
) -> None:
    bookmarks = {stream: bookmark_values}
    with open(absolute_path_to_destination_state, 'w') as f:
        line = json.dumps(dict(bookmarks=bookmarks))
        f.write(line)
