import { NextPageContext } from 'next';
import Cookies from 'js-cookie';
import ServerCookie from 'next-cookies';
import ls from 'local-storage';

import GroupType from '@interfaces/GroupType';
import GroupMembershipType from '@interfaces/GroupMembershipType';
import UserType from '@interfaces/UserType';
import { COOKIE_KEY, SHARED_OPTS } from '@api/utils/token';
import { resetObjectCounts } from '@storage/localStorage';

export const REQUIRE_USER_AUTHENTICATION = false;

export const CURRENT_GROUP_ID_COOKIE_KEY: string = 'current_group_id';
export const CURRENT_GROUP_LOCAL_STORAGE_KEY: string = 'current_group';
export const CURRENT_GROUP_MEMBERSHIP_LOCAL_STORAGE_KEY: string = 'current_group_membership';
export const CURRENT_USER_LOCAL_STORAGE_KEY: string = 'current_user';

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
  const groupId = Cookies.get(CURRENT_GROUP_ID_COOKIE_KEY, SHARED_OPTS);

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

export function getUser(): UserType | undefined {
  // @ts-ignore
  return ls.get(CURRENT_USER_LOCAL_STORAGE_KEY);
}

export function setUser(user: UserType) {
  // @ts-ignore
  ls.set(CURRENT_USER_LOCAL_STORAGE_KEY, user);
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
