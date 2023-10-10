export default interface RoleType {
  created_at?: string;
  id: number;
  name: string;
  permissions: any[];
  user: {
    first_name?: string;
    id?: string;
    last_name?: string;
    username?: string;
  };
}
