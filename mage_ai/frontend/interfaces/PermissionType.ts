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
}

export default interface Permission {
  access?: PermissionAccessEnum;
  created_at?: string;
  entity_id?: number | string;
  entity_name?: string;
  entity_type?: string;
  id?: number;
  query_attributes?: string[];
  read_attributes?: string[];
  roles?: {
    created_at?: string;
    id: number;
    name: string;
    updated_at?: string;
    user: {
      first_name?: string;
      id?: string;
      last_name?: string;
      username?: string;
    };
  }[];
  updated_at?: string;
  user_id?: number;
  write_attributes?: string[];
}
