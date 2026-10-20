from mage_integrations.sources.constants import (
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
)
from mage_integrations.sources.redshift.constants import (
    DATA_TYPE_BOOLEAN,
    DATA_TYPE_BIGINT,
    DATA_TYPE_DOUBLE_PRECISION,
    DATA_TYPE_TEXT,
    DATA_TYPE_VARCHAR,
)


def column_type_mapping(column_type: str, column_format: str = None) -> str:
    if COLUMN_TYPE_BOOLEAN == column_type:
        return DATA_TYPE_BOOLEAN
    elif COLUMN_TYPE_INTEGER == column_type:
        return DATA_TYPE_BIGINT
    elif COLUMN_TYPE_NUMBER == column_type:
        return DATA_TYPE_DOUBLE_PRECISION
    elif COLUMN_TYPE_OBJECT == column_type:
        return DATA_TYPE_TEXT

    return DATA_TYPE_VARCHAR
