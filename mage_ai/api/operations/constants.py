from enum import Enum

ALL = 'all'
CREATE = 'create'
DELETE = 'delete'
DETAIL = 'detail'
LIST = 'list'
UPDATE = 'update'

READ = 'read'
WRITE = 'write'

FILE_KEY_NAME = 'file'

META_KEY_FORMAT = '_format'
META_KEY_LIMIT = '_limit'
META_KEY_OFFSET = '_offset'
META_KEY_ORDER_BY = '_order_by[]'

COOKIE_PREFIX = '__COOKIE__'


class OperationType(str, Enum):
    ALL = ALL
    CREATE = CREATE
    DELETE = DELETE
    DETAIL = DETAIL
    LIST = LIST
    UPDATE = UPDATE
