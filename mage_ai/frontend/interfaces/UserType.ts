import RoleType from './RoleType';

export enum RoleValueEnum {
  ADMIN = 1,
  EDITOR = 2,
  OWNER = 'owner',
  VIEWER = 4,
}

export const ROLE_DISPLAY_MAPPING = {
  [RoleValueEnum.ADMIN]: 'Admin',
  [RoleValueEnum.EDITOR]: 'Editor',
  [RoleValueEnum.OWNER]: 'Owner',
  [RoleValueEnum.VIEWER]: 'Viewer',
};

export const ROLES = [
  RoleValueEnum.VIEWER,
  RoleValueEnum.EDITOR,
  RoleValueEnum.ADMIN,
];

export default interface UserType {
  avatar?: string;
  email?: string;
  first_name?: string;
  id?: string;
  last_name?: string;
  owner?: boolean;
  password?: string;
  password_confirmation?: string;
  password_current?: string;
  project_access?: number;
  roles?: number;
  roles_new?: RoleType[];
  roles_display?: string;
  username?: string;
}
