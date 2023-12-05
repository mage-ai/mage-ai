import {
  PERMISSION_ACCESS_HUMAN_READABLE_MAPPING,
  PermissionAccessEnum,
} from '@interfaces/PermissionType';

export function displayNames(access: number): string[] {
  return Object.entries(PERMISSION_ACCESS_HUMAN_READABLE_MAPPING).reduce((acc, [
    permissionAccess,
    displayName,
  ]) => {
    if (access & Number(permissionAccess)) {
      return acc.concat(displayName);
    }

    return acc;
  }, []);
}
