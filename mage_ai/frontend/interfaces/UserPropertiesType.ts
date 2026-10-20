import { getGroup, getUser } from '@utils/session';

export default interface UserPropertiesType {
  id?: number | string;
}

export function buildUserProperties(
  userProperties: UserPropertiesType = {},
  basePath?: string,
) {
  return {
    ...userProperties,
    groupId: getGroup()?.id,
    id: getUser(basePath)?.id,
  };
}
