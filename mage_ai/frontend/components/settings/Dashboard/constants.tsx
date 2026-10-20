import UserType, { RoleValueEnum } from '@interfaces/UserType';
import { REQUIRE_USER_AUTHENTICATION, REQUIRE_USER_PERMISSIONS } from '@utils/session';
import {
  BlocksSeparated,
  Locked,
  Settings,
  SettingsWithKnobs,
  Sun,
  VisibleEye,
  WorkspacesIcon,
  WorkspacesUsersIcon,
} from '@oracle/icons';

export const SECTION_ITEM_UUID_GIT_SETTINGS = 'Git settings';
export const SECTION_ITEM_UUID_PREFERENCES = 'Preferences';
export const SECTION_ITEM_UUID_PLATFORM_PREFERENCES = 'Preferences';
export const SECTION_ITEM_UUID_PLATFORM_SETTINGS = 'Settings';
export const SECTION_ITEM_UUID_USERS = 'Users';
export const SECTION_UUID_WORKSPACE = 'Workspace';

export enum SectionEnum {
  PROJECT_PLATFORM = 'Platform',
  WORKSPACE = 'Workspace',
  USER_MANAGEMENT = 'User management',
}

export enum SectionItemEnum {
  PERMISSIONS = 'Permissions',
  PREFERENCES = 'Preferences',
  ROLES = 'Roles',
  SETTINGS = 'Settings',
  USERS = 'Users',
}

export const SECTION_UUID_ACCOUNT = 'Account';
export const SECTION_ITEM_UUID_PROFILE = 'Profile';

export const SECTIONS = ({ owner, roles, project_access }: UserType, opts?: {
  projectPlatformActivated?: boolean;
}) => {
  const {
    projectPlatformActivated,
  } = opts || {
    projectPlatformActivated: false,
  };
  const hasAdminPrivileges = owner || roles === RoleValueEnum.ADMIN || (project_access & 3) !== 0;

  const workspaceItems = [
    {
      Icon: WorkspacesIcon,
      linkProps: {
        href: '/settings/workspace/preferences',
      },
      uuid: SECTION_ITEM_UUID_PREFERENCES,
    },
    {
      Icon: Settings,
      linkProps: {
        href: '/settings/workspace/sync-data',
      },
      uuid: SECTION_ITEM_UUID_GIT_SETTINGS,
    },
  ];

  const arr = [
    {
      items: workspaceItems,
      uuid: SECTION_UUID_WORKSPACE,
    },
  ];

  if (REQUIRE_USER_AUTHENTICATION() && hasAdminPrivileges) {
    const items = [
      {
        Icon: WorkspacesUsersIcon,
        linkProps: {
          href: '/settings/workspace/users',
        },
        uuid: SectionItemEnum.USERS,
      },
    ];

    if (REQUIRE_USER_PERMISSIONS()) {
      items.push(...[
        {
          Icon: VisibleEye,
          linkProps: {
            href: '/settings/workspace/roles',
          },
          uuid: SectionItemEnum.ROLES,
        },
        {
          Icon: Locked,
          linkProps: {
            href: '/settings/workspace/permissions',
          },
          uuid: SectionItemEnum.PERMISSIONS,
        },
      ]);
    }

    arr.push({
      items,
      uuid: SectionEnum.USER_MANAGEMENT,
    });
  }

  if (projectPlatformActivated
    && (!REQUIRE_USER_AUTHENTICATION() || hasAdminPrivileges)
  ) {
    arr.push({
      items: [
        {
          Icon: BlocksSeparated,
          linkProps: {
            href: '/settings/platform/preferences',
          },
          uuid: SectionItemEnum.PREFERENCES,
        },
        {
          Icon: SettingsWithKnobs,
          linkProps: {
            href: '/settings/platform/settings',
          },
          uuid: SectionItemEnum.SETTINGS,
        },
      ],
      uuid: SectionEnum.PROJECT_PLATFORM,
    });
  }

  if (!REQUIRE_USER_AUTHENTICATION()) {
    return arr;
  }

  return arr.concat([
    {
      items: [
        {
          Icon: Sun,
          linkProps: {
            href: '/settings/account/profile',
          },
          uuid: SECTION_ITEM_UUID_PROFILE,
        },
      ],
      uuid: SECTION_UUID_ACCOUNT,
    },
  ]);
};
