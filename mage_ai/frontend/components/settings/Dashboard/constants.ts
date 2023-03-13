import UserType, { RoleValueEnum } from '@interfaces/UserType';
import { REQUIRE_USER_AUTHENTICATION } from '@utils/session';

export const SECTION_UUID_WORKSPACE = 'Workspace';
export const SECTION_ITEM_UUID_PREFERENCES = 'Preferences';
export const SECTION_ITEM_UUID_GIT_SETTINGS = 'Git settings';
export const SECTION_ITEM_UUID_USERS = 'Users';

export const SECTION_UUID_ACCOUNT = 'Account';
export const SECTION_ITEM_UUID_PROFILE = 'Profile';

export const SECTIONS = ({ owner, roles }: UserType) => {
  const workspaceItems = [
    {
      linkProps: {
        href: '/settings/workspace/preferences',
      },
      uuid: SECTION_ITEM_UUID_PREFERENCES,
    },
  ];

  if (owner) {
    workspaceItems.push({
      linkProps: {
        href: '/settings/workspace/users',
      },
      uuid: SECTION_ITEM_UUID_USERS,
    });
  }

  if (!REQUIRE_USER_AUTHENTICATION() || roles <= RoleValueEnum.EDITOR) {
    workspaceItems.push({
      linkProps: {
        href: '/settings/workspace/sync_data',
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
