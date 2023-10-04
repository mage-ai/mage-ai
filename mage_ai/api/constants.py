from enum import Enum

META_KEY_LIMIT = '_limit'
META_KEY_OFFSET = '_offset'


class AttributeOperationType(str, Enum):
    READ = 'read'
    WRITE = 'write'
