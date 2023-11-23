from enum import Enum

from mage_ai.authentication.permissions.constants import EntityName

DISABLED_RESOURCE_TYPES = [
    EntityName.ALL,
    EntityName.ALL_EXCEPT_RESERVED,
]

RESTRICTED_RESOURCE_TYPES = [
    EntityName.File,
    EntityName.FileContent,
    EntityName.Folder,
    EntityName.GlobalHook,
    EntityName.Oauth,
    EntityName.OauthAccessToken,
    EntityName.OauthApplication,
    EntityName.Permission,
    EntityName.Role,
    EntityName.RolePermission,
    EntityName.Secret,
    EntityName.Session,
    EntityName.User,
    EntityName.UserRole,
    EntityName.Workspace,
]

RESOURCE_TYPES = [en for en in EntityName if en not in DISABLED_RESOURCE_TYPES]


class HookOutputKey(str, Enum):
    ERROR = 'error'
    META = 'meta'
    METADATA = 'metadata'
    PAYLOAD = 'payload'
    QUERY = 'query'
    RESOURCE = 'resource'
    RESOURCES = 'resources'


VALID_KEYS_FOR_INPUT_OUTPUT_DATA_RESTRICTED = [key.value for key in HookOutputKey]
VALID_KEYS_FOR_INPUT_OUTPUT_DATA_UNRESTRICTED = [
    'hook',
    'resource_id',
    'resource_parent_id',
    'user',
]
VALID_KEYS_FOR_INPUT_OUTPUT_DATA_ALL = \
    VALID_KEYS_FOR_INPUT_OUTPUT_DATA_RESTRICTED + VALID_KEYS_FOR_INPUT_OUTPUT_DATA_UNRESTRICTED

INTERNAL_DEFAULT_PREDICATE_VALUE = '__INTERNAL_DEFAULT_PREDICATE_VALUE__'


class PredicateAndOrOperator(str, Enum):
    AND = 'and'
    OR = 'or'


class PredicateObjectType(str, Enum):
    ERROR = HookOutputKey.ERROR.value
    HOOK = 'hook'
    META = HookOutputKey.META.value
    METADATA = HookOutputKey.METADATA.value
    OPERATION_RESOURCE = 'operation_resource'
    PAYLOAD = HookOutputKey.PAYLOAD.value
    QUERY = HookOutputKey.QUERY.value
    RESOURCE = HookOutputKey.RESOURCE.value
    RESOURCES = HookOutputKey.RESOURCES.value
    RESOURCE_ID = 'resource_id'
    RESOURCE_PARENT_ID = 'resource_parent_id'
    USER = 'user'


class PredicateOperator(str, Enum):
    EQUALS = 'EQUALS'
    GREATER_THAN = 'GREATER_THAN'
    GREATER_THAN_OR_EQUALS = 'GREATER_THAN_OR_EQUALS'
    INCLUDES = 'INCLUDES'
    LESS_THAN = 'LESS_THAN'
    LESS_THAN_OR_EQUALS = 'LESS_THAN_OR_EQUALS'
    NOT_EQUALS = 'NOT_EQUALS'
    NOT_INCLUDES = 'NOT_INCLUDES'
    NOT_PRESENT = 'NOT_PRESENT'
    PRESENT = 'PRESENT'


class PredicateValueDataType(str, Enum):
    BOOLEAN = 'BOOLEAN'
    DICTIONARY = 'DICTIONARY'
    FLOAT = 'FLOAT'
    INTEGER = 'INTEGER'
    LIST = 'LIST'
    STRING = 'STRING'
