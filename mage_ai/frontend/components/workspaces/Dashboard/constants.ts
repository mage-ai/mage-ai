import UserType, { RoleValueEnum } from '@interfaces/UserType';
import { ProjectTypeEnum } from '@interfaces/ProjectType';
import { Settings, WorkspacesIcon, WorkspacesUsersIcon } from '@oracle/icons';

export const SECTION_UUID_WORKSPACE = 'Workspace';

export enum WorkspacesPageNameEnum {
  WORKSPACES = 'workspaces',
  USERS = 'users',
  SETTINGS = 'settings',
}

export function buildNavigationItems(
  { owner, roles }: UserType,
  projectType: string,
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

  if (owner) {
    workspaceItems.push({
      Icon: WorkspacesUsersIcon,
      id: WorkspacesPageNameEnum.USERS,
      isSelected: () => WorkspacesPageNameEnum.USERS === pageName,
      label: () => 'Users',
      linkProps: {
        href: '/manage/users',
      },
    });
  }

  if (projectType == ProjectTypeEnum.MAIN) {
    workspaceItems.push({
      Icon: Settings,
      id: WorkspacesPageNameEnum.SETTINGS,
      isSelected: () => WorkspacesPageNameEnum.SETTINGS === pageName,
      label: () => 'Settings',
      linkProps: {
        href: '/manage/settings',
      },
    });
  }

  return workspaceItems;
}
