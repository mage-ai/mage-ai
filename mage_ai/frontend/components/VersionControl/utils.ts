import * as osPath from 'path';
import { getFullPath } from '@utils/files';
import { intersection} from '@utils/array';

export function fileInMapping(file, mapping) {
  const fp = getFullPath(file);
  const keys = Object.keys(mapping) || [];

  return keys?.find(key => fp?.endsWith(key));
}

export function filePathRelativeToRepoPath(
  filePath: string,
  repoPath: string,
  rootProjectPath: string,
): string {
  // dbt1/models/example/model3.sql
  // /home/src/data-vault/dbt1
  // Final: models/example/model3.sql

  const parts1 = repoPath?.split(osPath.sep);
  const parts2 = rootProjectPath?.split(osPath.sep);
  const same = intersection(parts1, parts2);

  const diff = parts1?.slice(same?.length, parts1?.length);
  const parts3 = filePath?.split(osPath.sep);
  const same2 = intersection(parts3, diff);

  return parts3?.slice(same2?.length, parts3?.length)?.join(osPath.sep);
}
