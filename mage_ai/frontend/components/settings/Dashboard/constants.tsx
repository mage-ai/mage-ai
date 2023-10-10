import UserType, { RoleValueEnum } from '@interfaces/UserType';
import { REQUIRE_USER_AUTHENTICATION } from '@utils/session';
import {
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
  WORKSPACE = SECTION_UUID_WORKSPACE,
}

export enum SectionItemEnum {
  ROLES = 'Roles',
  USERS = SECTION_ITEM_UUID_USERS,
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

  if (owner || roles === RoleValueEnum.ADMIN || (project_access & 2) !== 0) {
    workspaceItems.push(...[
      {
        Icon: WorkspacesUsersIcon,
        linkProps: {
          href: '/settings/workspace/users',
        },
        uuid: SectionItemEnum.USERS,
      },
      {
        Icon: VisibleEye,
        linkProps: {
          href: '/settings/workspace/roles',
        },
        uuid: SectionItemEnum.ROLES,
      },
    ]);
  }
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
