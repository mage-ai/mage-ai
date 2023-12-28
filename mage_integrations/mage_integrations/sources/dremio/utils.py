from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_FORMAT_UUID,
    COLUMN_TYPE_INTEGER,
)
from mage_integrations.sources.sql.base import column_type_mapping


def postgres_column_type_mapping(column_type: str, column_format: str = None) -> str:
    if COLUMN_FORMAT_DATETIME == column_format:
        return 'TIMESTAMP'
    elif COLUMN_FORMAT_UUID == column_format:
        return 'UUID'
    return column_type_mapping(column_type, column_format)


def mssql_column_type_mapping(column_type: str, column_format: str = None) -> str:
    if COLUMN_FORMAT_DATETIME == column_format:
        return 'DATETIME'
    return column_type_mapping(column_type, column_format)


def mysql_column_type_mapping(column_type: str, column_format: str = None) -> str:
    if COLUMN_FORMAT_DATETIME == column_format:
        return 'DATETIME'
    elif COLUMN_TYPE_INTEGER == column_type:
        return 'UNSIGNED'
    return column_type_mapping(column_type, column_format)
