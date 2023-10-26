export enum PermissionAccessEnum {
  OWNER = 1,
  ADMIN = 2,
  EDITOR = 4,
  VIEWER = 8,
  LIST = 16,
  DETAIL = 32,
  CREATE = 64,
  UPDATE = 128,
  DELETE = 512,
  OPERATION_ALL = 1024,
  QUERY = 2048,
  QUERY_ALL = 4096,
  READ = 8192,
  READ_ALL = 16384,
  WRITE = 32768,
  WRITE_ALL = 65536,
  ALL = 131072,
  DISABLE_LIST = 262144,
  DISABLE_DETAIL = 524288,
  DISABLE_CREATE = 1048576,
  DISABLE_UPDATE = 2097152,
  DISABLE_DELETE = 4194304,
  DISABLE_OPERATION_ALL = 8388608,
  DISABLE_QUERY = 16777216,
  DISABLE_QUERY_ALL = 33554432,
  DISABLE_READ = 67108864,
  DISABLE_READ_ALL = 134217728,
  DISABLE_WRITE = 268435456,
  DISABLE_WRITE_ALL = 536870912,
  DISABLE_UNLESS_CONDITIONS = 1073741824
}

export enum PermissionConditionEnum {
  HAS_NOTEBOOK_EDIT_ACCESS = 'HAS_NOTEBOOK_EDIT_ACCESS',
  HAS_PIPELINE_EDIT_ACCESS = 'HAS_PIPELINE_EDIT_ACCESS',
  USER_OWNS_ENTITY = 'USER_OWNS_ENTITY',
}

export const PERMISSION_ACCESS_HUMAN_READABLE_MAPPING = {
  [PermissionAccessEnum.OWNER]: 'Owner',
  [PermissionAccessEnum.ADMIN]: 'Admin',
  [PermissionAccessEnum.EDITOR]: 'Editor',
  [PermissionAccessEnum.VIEWER]: 'Viewer',
  [PermissionAccessEnum.LIST]: 'List',
  [PermissionAccessEnum.DETAIL]: 'Detail',
  [PermissionAccessEnum.CREATE]: 'Create',
  [PermissionAccessEnum.UPDATE]: 'Update',
  [PermissionAccessEnum.DELETE]: 'Delete',
  [PermissionAccessEnum.OPERATION_ALL]: 'All operations',
  [PermissionAccessEnum.QUERY]: 'Query',
  [PermissionAccessEnum.QUERY_ALL]: 'Query all attributes',
  [PermissionAccessEnum.READ]: 'Read',
  [PermissionAccessEnum.READ_ALL]: 'Read all attributes',
  [PermissionAccessEnum.WRITE]: 'Write',
  [PermissionAccessEnum.WRITE_ALL]: 'Write all attributes',
  [PermissionAccessEnum.ALL]: 'All',
  [PermissionAccessEnum.DISABLE_LIST]: 'Disable list',
  [PermissionAccessEnum.DISABLE_DETAIL]: 'Disable detail',
  [PermissionAccessEnum.DISABLE_CREATE]: 'Disable create',
  [PermissionAccessEnum.DISABLE_UPDATE]: 'Disable update',
  [PermissionAccessEnum.DISABLE_DELETE]: 'Disable delete',
  [PermissionAccessEnum.DISABLE_OPERATION_ALL]: 'Disable all operations',
  [PermissionAccessEnum.DISABLE_QUERY]: 'Disable query',
  [PermissionAccessEnum.DISABLE_QUERY_ALL]: 'Disable all query parameters',
  [PermissionAccessEnum.DISABLE_READ]: 'Disable read',
  [PermissionAccessEnum.DISABLE_READ_ALL]: 'Disable all read attributes',
  [PermissionAccessEnum.DISABLE_WRITE]: 'Disable write',
  [PermissionAccessEnum.DISABLE_WRITE_ALL]: 'Disable all write attributes',
};

export const PERMISSION_CONDITION_HUMAN_READABLE_MAPPING = {
  [PermissionConditionEnum.HAS_NOTEBOOK_EDIT_ACCESS]: 'Disable unless user has notebook edit access',
  [PermissionConditionEnum.HAS_PIPELINE_EDIT_ACCESS]: 'Disable unless user has pipeline edit access',
  [PermissionConditionEnum.USER_OWNS_ENTITY]: 'Disable unless user owns the current entity',
};

export const PERMISSION_ACCESS_GROUPS = [
  PermissionAccessEnum.OWNER,
  PermissionAccessEnum.ADMIN,
  PermissionAccessEnum.EDITOR,
  PermissionAccessEnum.VIEWER,
  PermissionAccessEnum.ALL,
];

export const PERMISSION_ACCESS_OPERATIONS = [
  PermissionAccessEnum.LIST,
  PermissionAccessEnum.DETAIL,
  PermissionAccessEnum.CREATE,
  PermissionAccessEnum.UPDATE,
  PermissionAccessEnum.DELETE,
  PermissionAccessEnum.OPERATION_ALL,
];

export const PERMISSION_DISABLE_ACCESS_OPERATIONS = [
  PermissionAccessEnum.DISABLE_LIST,
  PermissionAccessEnum.DISABLE_DETAIL,
  PermissionAccessEnum.DISABLE_CREATE,
  PermissionAccessEnum.DISABLE_UPDATE,
  PermissionAccessEnum.DISABLE_DELETE,
  PermissionAccessEnum.DISABLE_OPERATION_ALL,
];

export const PERMISSION_ACCESS_QUERY_OPERATIONS = [
  PermissionAccessEnum.QUERY,
  PermissionAccessEnum.QUERY_ALL,
  PermissionAccessEnum.DISABLE_QUERY,
  PermissionAccessEnum.DISABLE_QUERY_ALL,
];

export const PERMISSION_ACCESS_READ_OPERATIONS = [
  PermissionAccessEnum.READ,
  PermissionAccessEnum.READ_ALL,
  PermissionAccessEnum.DISABLE_READ,
  PermissionAccessEnum.DISABLE_READ_ALL,
];

export const PERMISSION_ACCESS_WRITE_OPERATIONS = [
  PermissionAccessEnum.WRITE,
  PermissionAccessEnum.WRITE_ALL,
  PermissionAccessEnum.DISABLE_WRITE,
  PermissionAccessEnum.DISABLE_WRITE_ALL,
];

export interface UserType {
  first_name?: string;
  id?: string;
  last_name?: string;
  username?: string;
}

export default interface PermissionType {
  access?: PermissionAccessEnum;
  conditions?: PermissionConditionEnum[];
  created_at?: string;
  entity?: string;
  entity_id?: number | string;
  entity_name?: string;
  entity_names?: string[];
  entity_type?: string;
  entity_types?: string[];
  id?: number;
  query_attributes?: string[];
  read_attributes?: string[];
  roles?: {
    created_at?: string;
    id: number;
    name: string;
    updated_at?: string;
    user: UserType;
  }[];
  updated_at?: string;
  user?: UserType;
  users?: UserType[];
  user_id?: number;
  write_attributes?: string[];
}
