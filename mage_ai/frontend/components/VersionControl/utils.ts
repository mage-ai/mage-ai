import { getFullPath } from '@utils/files';

export function fileInMapping(file, mapping) {
  const fp = getFullPath(file);
  const keys = Object.keys(mapping) || [];

  return keys?.find(key => fp?.endsWith(key));
}
