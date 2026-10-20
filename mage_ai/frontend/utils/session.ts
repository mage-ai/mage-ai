import { NextPageContext } from 'next';
import Cookies from 'js-cookie';
import ServerCookie from 'next-cookies';
import ls from 'local-storage';

import GroupType from '@interfaces/GroupType';
import GroupMembershipType from '@interfaces/GroupMembershipType';
import UserType, { RoleValueEnum, UserAccessEnum } from '@interfaces/UserType';
import { COOKIE_KEY, SHARED_OPTS } from '@api/utils/token';
import { SHARED_COOKIE_PROPERTIES } from '@utils/cookies/constants';
import { resetObjectCounts } from '@storage/localStorage';

export const REQUIRE_USER_AUTHENTICATION_COOKIE_KEY = 'REQUIRE_USER_AUTHENTICATION';
export const REQUIRE_USER_AUTHENTICATION_LOCAL_STORAGE_KEY = 'REQUIRE_USER_AUTHENTICATION';
export const REQUIRE_USER_AUTHENTICATION_COOKIE_PROPERTIES = {
  ...SHARED_COOKIE_PROPERTIES,
  expires: 1,
};

export const REQUIRE_USER_PERMISSIONS_COOKIE_KEY = 'REQUIRE_USER_PERMISSIONS';
export const REQUIRE_USER_PERMISSIONS_LOCAL_STORAGE_KEY = 'REQUIRE_USER_PERMISSIONS';
export const REQUIRE_USER_PERMISSIONS_COOKIE_PROPERTIES = {
  ...SHARED_COOKIE_PROPERTIES,
  expires: 1,
};

export const REQUIRE_USER_AUTHENTICATION = (ctx: any = null) => {
  let val;

  if (ctx) {
    const cookie = ServerCookie(ctx);
    val = cookie[REQUIRE_USER_AUTHENTICATION_COOKIE_KEY];
  } else {
    val = Cookies.get(
      REQUIRE_USER_AUTHENTICATION_COOKIE_KEY,
    );
  }

  if (!!val) {
    return String(val) !== '0' && String(val).toLowerCase() !== 'false';
  }

  return false;
};

export const REQUIRE_USER_PERMISSIONS = (ctx: any = null) => {
  let val;

  if (ctx) {
    const cookie = ServerCookie(ctx);
    val = cookie[REQUIRE_USER_PERMISSIONS_COOKIE_KEY];
  } else {
    val = Cookies.get(
      REQUIRE_USER_PERMISSIONS_COOKIE_KEY,
    );
  }

  if (!!val) {
    return String(val) !== '0' && String(val).toLowerCase() !== 'false';
  }

  return false;
};

export const CURRENT_GROUP_ID_COOKIE_KEY: string = 'current_group_id';
export const CURRENT_GROUP_LOCAL_STORAGE_KEY: string = 'current_group';
export const CURRENT_GROUP_MEMBERSHIP_LOCAL_STORAGE_KEY: string = 'current_group_membership';
export const CURRENT_USER_LOCAL_STORAGE_KEY: string = 'current_user';

export const getCurrentUserLocalStorageKey = (basePath?: string) => (
  basePath
    ? `${basePath}_${CURRENT_USER_LOCAL_STORAGE_KEY}`
    : CURRENT_USER_LOCAL_STORAGE_KEY
);

export function getGroup(ctx: any = undefined): GroupType | { id?: string } | undefined {
  if (ctx) {
    const cookie = ServerCookie(ctx);
    const currentGroupId: string | undefined = cookie[CURRENT_GROUP_ID_COOKIE_KEY];

    return {
      id: currentGroupId,
    };
  }

  // @ts-ignore
  const group = ls.get(CURRENT_GROUP_LOCAL_STORAGE_KEY);
  const groupId = Cookies.get(CURRENT_GROUP_ID_COOKIE_KEY);

  if (group && groupId) {
    return group;
  }
}

export function setGroup(group: GroupType) {
  Cookies.set(CURRENT_GROUP_ID_COOKIE_KEY, group.id, { ...SHARED_OPTS, expires: 9999 });
  // @ts-ignore
  ls.set(CURRENT_GROUP_LOCAL_STORAGE_KEY, group);
  resetObjectCounts();
}

export function removeGroup() {
  Cookies.remove(CURRENT_GROUP_ID_COOKIE_KEY, SHARED_OPTS);
  // @ts-ignore
  ls.remove(CURRENT_GROUP_LOCAL_STORAGE_KEY);
}

export function removeUser(basePath?: string) {
  // @ts-ignore
  ls.remove(getCurrentUserLocalStorageKey(basePath));
}

export function getUser(basePath?: string): UserType | undefined {
  // @ts-ignore
  return ls.get(getCurrentUserLocalStorageKey(basePath));
}

export function setUser(user: UserType, basePath?: string) {
  // @ts-ignore
  ls.set(getCurrentUserLocalStorageKey(basePath), user);
}

export function getGroupMembership(): GroupMembershipType | undefined {
  // @ts-ignore
  return ls.get(CURRENT_GROUP_MEMBERSHIP_LOCAL_STORAGE_KEY);
}

export function setGroupMembership(groupMembership: GroupMembershipType) {
  // @ts-ignore
  ls.set(CURRENT_GROUP_MEMBERSHIP_LOCAL_STORAGE_KEY, groupMembership);
}

export function removeGroupMembership() {
  // @ts-ignore
  ls.remove(CURRENT_GROUP_MEMBERSHIP_LOCAL_STORAGE_KEY);
}

export const isLoggedIn = (ctx: NextPageContext) => {
  const cookie = ServerCookie(ctx);
  const token: string | undefined = cookie[COOKIE_KEY];
  return !!token;
};

export function isViewer(basePath?: string): boolean {
  const user = getUser(basePath) || {};
  return user.roles === RoleValueEnum.VIEWER ||
      user.project_access === UserAccessEnum.VIEWER;
}

export function setWithExpiry(key, value, ttl) {
  const now = new Date();

  // `item` is an object which contains the original value
  // as well as the time when it's supposed to expire
  const item = {
    expiry: now.getTime() + ttl,
    value: value,
  };

  // @ts-ignore
  ls.set(key, JSON.stringify(item));
}

export function getWithExpiry(key) {
  // @ts-ignore
  const itemStr = ls.get(key);

  // if the item doesn't exist, return null
  if (!itemStr) {
    return null;
  }

  const item = JSON.parse(itemStr);
  const now = new Date();

  // compare the expiry time of the item with the current time
  if (now.getTime() > item.expiry) {
    // If the item is expired, delete the item from storage
    // and return null
    // @ts-ignore
    ls.remove(key);

    return null;
  }
  return item.value;
}
