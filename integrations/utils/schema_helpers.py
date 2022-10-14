from sources.constants import (
    INCLUSION_AUTOMATIC,
    INCLUSION_UNSUPPORTED,
    METADATA_KEY_INCLUSION,
    METADATA_KEY_SELECTED,
)
from typing import List


def extract_selected_columns(metadata_array: List[dict]) -> List[str]:
    columns = []

    for d in metadata_array:
        breadcrumb = d.get('breadcrumb')
        metadata = d.get('metadata')
        if breadcrumb and \
           metadata and \
           len(breadcrumb) == 2 and \
           breadcrumb[0] == 'properties':
            column = breadcrumb[1]
            selected = metadata.get(METADATA_KEY_SELECTED, False)
            inclusion = metadata.get(METADATA_KEY_INCLUSION, INCLUSION_UNSUPPORTED)
            if INCLUSION_AUTOMATIC == inclusion:
                selected = True

            if selected:
                columns.append(column)

    return columns
