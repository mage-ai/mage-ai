import Permission from './Permission';

export default interface RoleType {
  created_at?: string;
  id: number;
  name: string;
  permissions: any[];
  role_permissions: Permission[];
  updated_at?: string;
  user: {
    first_name?: string;
    id?: string;
    last_name?: string;
    username?: string;
  };
}
