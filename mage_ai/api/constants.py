from enum import Enum

from mage_ai.api.operations.constants import OperationType
from mage_ai.orchestration.db.models.oauth import Permission


class AttributeOperationType(str, Enum):
    QUERY = 'query'
    READ = 'read'
    WRITE = 'write'


class AttributeType(str, Enum):
    ALL = '__*MAGE*__'


class AuthorizeStatusType(str, Enum):
    ALL = 'all'
    FAILED = 'failed'
    SUCCEEDED = 'succeeded'


OPERATION_TYPE_TO_ACCESS_MAPPING = {
  OperationType.ALL: Permission.Access.OPERATION_ALL,
  OperationType.CREATE: Permission.Access.CREATE,
  OperationType.DELETE: Permission.Access.DELETE,
  OperationType.DETAIL: Permission.Access.DETAIL,
  OperationType.LIST: Permission.Access.LIST,
  OperationType.UPDATE: Permission.Access.UPDATE,
}

OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING = {
  OperationType.ALL: Permission.Access.DISABLE_OPERATION_ALL,
  OperationType.CREATE: Permission.Access.DISABLE_CREATE,
  OperationType.DELETE: Permission.Access.DISABLE_DELETE,
  OperationType.DETAIL: Permission.Access.DISABLE_DETAIL,
  OperationType.LIST: Permission.Access.DISABLE_LIST,
  OperationType.UPDATE: Permission.Access.DISABLE_UPDATE,
}

ATTRIBUTE_OPERATION_TYPE_TO_ACCESS_MAPPING = {
  AttributeOperationType.QUERY: Permission.Access.QUERY,
  AttributeOperationType.READ: Permission.Access.READ,
  AttributeOperationType.WRITE: Permission.Access.WRITE,
}

ATTRIBUTE_OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING = {
  AttributeOperationType.QUERY: Permission.Access.DISABLE_QUERY,
  AttributeOperationType.READ: Permission.Access.DISABLE_READ,
  AttributeOperationType.WRITE: Permission.Access.DISABLE_WRITE,
}

META_KEY_LIMIT = '_limit'
META_KEY_OFFSET = '_offset'

DOWNLOAD_TOKEN_LIFESPAN = 60  # Lifespan of generated download token in seconds
