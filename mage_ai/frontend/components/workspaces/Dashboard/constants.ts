import UserType, { RoleValueEnum } from '@interfaces/UserType';
import { Settings, WorkspacesIcon, WorkspacesUsersIcon } from '@oracle/icons';
import { REQUIRE_USER_AUTHENTICATION } from '@utils/session';

export const SECTION_UUID_WORKSPACE = 'Workspace';


export enum WorkspacesPageNameEnum {
  WORKSPACES = 'workspaces',
  USERS = 'users',
  SETTINGS = 'settings',
}

export function buildNavigationItems(
  { owner, roles }: UserType,
  pageName: string,
) {
  const workspaceItems = [
    {
      Icon: WorkspacesIcon,
      id: WorkspacesPageNameEnum.WORKSPACES,
      isSelected: () => WorkspacesPageNameEnum.WORKSPACES === pageName,
      label: () => 'Workspaces',
      linkProps: {
        href: '/manage',
      },
    },
  ];

  // if (owner || roles === RoleValueEnum.ADMIN) {
  //   workspaceItems.push({
  //     Icon: WorkspacesUsersIcon,
  //     id: WorkspacesPageNameEnum.USERS,
  //     isSelected: () => WorkspacesPageNameEnum.USERS === pageName,
  //     label: () => 'Users',
  //     linkProps: {
  //       href: '/manage/users',
  //     },
  //   });
  // }
  // if (!REQUIRE_USER_AUTHENTICATION() || roles <= RoleValueEnum.EDITOR) {
  //   workspaceItems.push({
  //     Icon: Settings,
  //     id: WorkspacesPageNameEnum.SETTINGS,
  //     isSelected: () => WorkspacesPageNameEnum.SETTINGS === pageName,
  //     label: () => 'Settings',
  //     linkProps: {
  //       href: '/manage/settings',
  //     },
  //   });
  // }

  return workspaceItems;
}
