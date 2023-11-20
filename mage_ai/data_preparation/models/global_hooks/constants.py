from mage_ai.authentication.permissions.constants import EntityName

DISABLED_RESOURCE_TYPES = [
  EntityName.ALL,
  EntityName.ALL_EXCEPT_RESERVED,
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
