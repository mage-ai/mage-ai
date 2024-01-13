import * as osPath from 'path';

import FileType from '@interfaces/FileType';

export function getFilenameFromFilePath(filePath: string): string {
  if (typeof filePath !== 'string' && typeof filePath === 'object') {
    filePath = (filePath as FileType)?.path || (filePath as FileType)?.name;
  }

  const parts = filePath?.split(osPath.sep);
  const filename = parts?.[parts?.length - 1];
  return filename;
}
