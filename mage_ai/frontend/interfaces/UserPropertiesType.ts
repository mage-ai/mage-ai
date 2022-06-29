import { getGroup, getUser } from '@utils/session';

export default interface UserPropertiesType {
  groupId?: number | string;
  id?: number | string;
}

export function buildUserProperties(userProperties: UserPropertiesType = {}) {
  return {
    ...userProperties,
    groupId: getGroup()?.id,
    id: getUser()?.id,
  };
}
