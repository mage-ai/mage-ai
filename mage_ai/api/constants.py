from enum import Enum

META_KEY_LIMIT = '_limit'
META_KEY_OFFSET = '_offset'


class AttributeOperationType(str, Enum):
    READ = 'read'
    WRITE = 'write'


class AttributeType(str, Enum):
    ALL = '__*MAGE*__'


class AuthorizeStatusType(str, Enum):
    ALL = 'all'
    FAILED = 'failed'
    SUCCEEDED = 'succeeded'
