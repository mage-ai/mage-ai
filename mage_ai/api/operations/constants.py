try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

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


class OperationType(StrEnum):
    ALL = ALL
    CREATE = CREATE
    DELETE = DELETE
    DETAIL = DETAIL
    LIST = LIST
    UPDATE = UPDATE
