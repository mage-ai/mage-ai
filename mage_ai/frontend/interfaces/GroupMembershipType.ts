import UserType from '@interfaces/UserType';
import { capitalize } from '@utils/string.js';

export enum RoleEnum {
  ADMIN = 1,
  MEMBER = 2,
  OWNER = 0,
}

export const ROLE_TEXT_MAPPING = {
  [RoleEnum.ADMIN]: i18n => capitalize(i18n.t('team.admin')),
  [RoleEnum.MEMBER]: i18n => capitalize(i18n.t('team.member')),
  [RoleEnum.OWNER]: i18n => capitalize(i18n.t('team.owner')),
};

export default interface GroupMembershipType {
  group_id: number;
  id: number;
  role?: RoleEnum;
  user: UserType,
}
