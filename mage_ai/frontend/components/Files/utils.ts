import * as osPath from 'path';

export function getFilenameFromFilePath(filePath: string): string {
  if (typeof filePath !== 'string' && typeof filePath === 'object') {
    filePath = filePath?.path || filePath?.name;
  }

  const parts = filePath?.split(osPath.sep);
  const filename = parts?.[parts?.length - 1];
  return filename;
}
