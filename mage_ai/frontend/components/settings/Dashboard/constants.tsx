import UserType, { RoleValueEnum } from '@interfaces/UserType';
import { REQUIRE_USER_AUTHENTICATION, REQUIRE_USER_PERMISSIONS } from '@utils/session';
import {
  Locked,
  Settings,
  Sun,
  VisibleEye,
  WorkspacesIcon,
  WorkspacesUsersIcon,
} from '@oracle/icons';

export const SECTION_UUID_WORKSPACE = 'Workspace';
export const SECTION_ITEM_UUID_PREFERENCES = 'Preferences';
export const SECTION_ITEM_UUID_GIT_SETTINGS = 'Git settings';
export const SECTION_ITEM_UUID_USERS = 'Users';

export enum SectionEnum {
  WORKSPACE = 'Workspace',
  USER_MANAGEMENT = 'User management',
}

export enum SectionItemEnum {
  ROLES = 'Roles',
  PERMISSIONS = 'Permissions',
  USERS = 'Users',
}

export const SECTION_UUID_ACCOUNT = 'Account';
export const SECTION_ITEM_UUID_PROFILE = 'Profile';

export const SECTIONS = ({ owner, roles, project_access }: UserType) => {
  const workspaceItems = [
    {
      Icon: WorkspacesIcon,
      linkProps: {
        href: '/settings/workspace/preferences',
      },
      uuid: SECTION_ITEM_UUID_PREFERENCES,
    },
  ];

  if (!REQUIRE_USER_AUTHENTICATION() || roles <= RoleValueEnum.EDITOR) {
    workspaceItems.push({
      Icon: Settings,
      linkProps: {
        href: '/settings/workspace/sync-data',
      },
      uuid: SECTION_ITEM_UUID_GIT_SETTINGS,
    });
  }

  const arr = [
    {
      items: workspaceItems,
      uuid: SECTION_UUID_WORKSPACE,
    },
  ];

  if (!REQUIRE_USER_AUTHENTICATION()) {
    return arr;
  }

  if (owner || roles === RoleValueEnum.ADMIN || (project_access & 2) !== 0) {
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
