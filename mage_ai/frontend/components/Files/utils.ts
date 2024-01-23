import * as osPath from 'path';

import FileType from '@interfaces/FileType';
import { lowercaseRemoveUnderscore } from '@utils/string';

export function getFilenameFromFilePath(filePath: string): string {
  if (typeof filePath !== 'string' && typeof filePath === 'object') {
    filePath = (filePath as FileType)?.path || (filePath as FileType)?.name;
  }

  const parts = filePath?.split(osPath.sep);
  const filename = parts?.[parts?.length - 1];
  return filename;
}

export function filterFiles(
  files: FileType[],
  name: string,
): FileType[] {
  return files.reduce((acc, { children, ...f }) => {
      if (lowercaseRemoveUnderscore(f.name).includes(lowercaseRemoveUnderscore(name)) && !children) {
          acc.push(f);

          return acc;
      }
      children = filterFiles(children || [], name);
      if (children?.length) {
          acc.push({ ...f, children });
      }

      return acc;
  }, []);
}
