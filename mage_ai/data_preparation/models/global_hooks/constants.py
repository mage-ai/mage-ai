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
