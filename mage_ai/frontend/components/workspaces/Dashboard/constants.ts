import UserType from '@interfaces/UserType';
import {
  File,
  NavDashboard,
  Schedule,
  Settings,
  WorkspacesIcon,
  WorkspacesUsersIcon,
} from '@oracle/icons';

export const SECTION_UUID_WORKSPACE = 'Workspace';

export enum WorkspacesPageNameEnum {
  OVERVIEW = 'overview',
  PIPELINE_RUNS = 'pipeline_runs',
  WORKSPACES = 'workspaces',
  USERS = 'users',
  SETTINGS = 'settings',
  FILE_BROWSER = 'file_browser',
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
    {
      Icon: NavDashboard,
      id: WorkspacesPageNameEnum.OVERVIEW,
      isSelected: () => WorkspacesPageNameEnum.OVERVIEW === pageName,
      label: () => 'Overview',
      linkProps: {
        href: '/manage/overview',
      },
    },
    {
      Icon: Schedule,
      id: WorkspacesPageNameEnum.PIPELINE_RUNS,
      isSelected: () => WorkspacesPageNameEnum.PIPELINE_RUNS === pageName,
      label: () => 'Pipeline runs',
      linkProps: {
        href: '/manage/pipeline-runs',
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

  workspaceItems.push(...[
    {
      Icon: File,
      id: WorkspacesPageNameEnum.FILE_BROWSER,
      isSelected: () => WorkspacesPageNameEnum.FILE_BROWSER === pageName,
      label: () => 'File browser',
      linkProps: {
        href: '/manage/files',
      },
    },
    {
      Icon: Settings,
      id: WorkspacesPageNameEnum.SETTINGS,
      isSelected: () => WorkspacesPageNameEnum.SETTINGS === pageName,
      label: () => 'Settings',
      linkProps: {
        href: '/manage/settings',
      },
    },
  ]);

  return workspaceItems;
}
