import PermissionType from './PermissionType';

export interface UserType {
  first_name?: string;
  id?: string;
  last_name?: string;
  username?: string;
}

export default interface RoleType {
  created_at?: string;
  id: number;
  name: string;
  permissions: any[];
  role_permissions: PermissionType[];
  updated_at?: string;
  user: UserType;
  users?: UserType[];
}
