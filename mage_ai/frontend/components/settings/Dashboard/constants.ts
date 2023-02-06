export const SECTION_UUID_WORKSPACE = 'Workspace';
export const SECTION_ITEM_UUID_PREFERENCES = 'Preferences';
export const SECTION_ITEM_UUID_USERS = 'Users';

export const SECTION_UUID_ACCOUNT = 'Account';
export const SECTION_ITEM_UUID_PROFILE = 'Profile';

export const SECTIONS = [
  {
    items: [
      {
        linkProps: {
          href: '/settings/workspace/preferences',
        },
        uuid: SECTION_ITEM_UUID_PREFERENCES,
      },
      {
        linkProps: {
          href: '/settings/workspace/users',
        },
        uuid: SECTION_ITEM_UUID_USERS,
      },
    ],
    uuid: SECTION_UUID_WORKSPACE,
  },
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
];
