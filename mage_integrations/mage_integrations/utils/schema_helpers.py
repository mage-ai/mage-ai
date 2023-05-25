from mage_integrations.sources.constants import (
    INCLUSION_AUTOMATIC,
    INCLUSION_UNSUPPORTED,
    METADATA_KEY_INCLUSION,
    METADATA_KEY_SELECTED,
)
from typing import Dict, List


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

            if selected:
                columns.append(column)

    return columns


def filter_columns(columns: List[str], properties: Dict, column_types: List[str]):
    filtered_columns = []
    for col in columns:
        if col not in properties:
            continue
        types = properties[col]['type']
        if any(t in column_types for t in types):
            filtered_columns.append(col)
    return filtered_columns
