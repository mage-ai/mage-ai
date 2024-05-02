from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.shared.enum import StrEnum

GLOBAL_HOOKS_FILENAME = 'global_hooks.yaml'

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


class HookOutputKey(StrEnum):
    ERROR = 'error'
    META = 'meta'
    METADATA = 'metadata'
    PAYLOAD = 'payload'
    QUERY = 'query'
    RESOURCE = 'resource'
    RESOURCES = 'resources'


class HookInputKey(StrEnum):
    HOOK = 'hook'
    PROJECT = 'project'
    RESOURCE_ID = 'resource_id'
    RESOURCE_PARENT = 'resource_parent'
    RESOURCE_PARENT_ID = 'resource_parent_id'
    RESOURCE_PARENT_TYPE = 'resource_parent_type'
    USER = 'user'


VALID_KEYS_FOR_INPUT_OUTPUT_DATA_RESTRICTED = [key.value for key in HookOutputKey] + [
    HookInputKey.RESOURCE_PARENT.value,
]
VALID_KEYS_FOR_INPUT_OUTPUT_DATA_UNRESTRICTED = [
    HookInputKey.HOOK.value,
    HookInputKey.PROJECT.value,
    HookInputKey.RESOURCE_ID.value,
    HookInputKey.RESOURCE_PARENT_ID.value,
    HookInputKey.RESOURCE_PARENT_TYPE.value,
    HookInputKey.USER.value,
]
VALID_KEYS_FOR_INPUT_OUTPUT_DATA_ALL = \
    VALID_KEYS_FOR_INPUT_OUTPUT_DATA_RESTRICTED + VALID_KEYS_FOR_INPUT_OUTPUT_DATA_UNRESTRICTED

INTERNAL_DEFAULT_PREDICATE_VALUE = '__INTERNAL_DEFAULT_PREDICATE_VALUE__'


class PredicateAndOrOperator(StrEnum):
    AND = 'and'
    OR = 'or'


class PredicateObjectType(StrEnum):
    ERROR = HookOutputKey.ERROR.value
    HOOK = HookInputKey.HOOK.value
    META = HookOutputKey.META.value
    METADATA = HookOutputKey.METADATA.value
    OPERATION_RESOURCE = 'operation_resource'
    PAYLOAD = HookOutputKey.PAYLOAD.value
    QUERY = HookOutputKey.QUERY.value
    RESOURCE = HookOutputKey.RESOURCE.value
    RESOURCES = HookOutputKey.RESOURCES.value
    RESOURCE_ID = HookInputKey.RESOURCE_ID.value
    RESOURCE_PARENT = HookInputKey.RESOURCE_PARENT.value
    RESOURCE_PARENT_ID = HookInputKey.RESOURCE_PARENT_ID.value
    RESOURCE_PARENT_TYPE = HookInputKey.RESOURCE_PARENT_TYPE.value
    USER = HookInputKey.USER.value


class PredicateOperator(StrEnum):
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


class PredicateValueDataType(StrEnum):
    BOOLEAN = 'BOOLEAN'
    DICTIONARY = 'DICTIONARY'
    FLOAT = 'FLOAT'
    INTEGER = 'INTEGER'
    LIST = 'LIST'
    STRING = 'STRING'
