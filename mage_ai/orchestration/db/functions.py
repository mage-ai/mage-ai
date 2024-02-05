from typing import List

from sqlalchemy.sql import func

from mage_ai.orchestration.db import db_connection_url
from mage_ai.orchestration.db.constants import DatabaseType


def database_type() -> DatabaseType:
    if db_connection_url.startswith('postgresql'):
        return DatabaseType.POSTGRESQL
    elif db_connection_url.startswith('sqlite'):
        return DatabaseType.SQLITE


def format_datetime(column, datetime_formats: List[str]):
    datetime_format = []
    for value in datetime_formats:
        if 'year' == value:
            if DatabaseType.POSTGRESQL == database_type():
                datetime_format.append('YYYY')
            else:
                datetime_format.append('%Y')
        elif 'month' == value:
            if DatabaseType.POSTGRESQL == database_type():
                datetime_format.append('MM')
            else:
                datetime_format.append('%m')
        elif 'day' == value:
            if DatabaseType.POSTGRESQL == database_type():
                datetime_format.append('DD')
            else:
                datetime_format.append('%d')

    datetime_format = '-'.join(datetime_format)

    if DatabaseType.POSTGRESQL == database_type():
        return func.to_char(column, datetime_format)

    return func.strftime(datetime_format, column)
