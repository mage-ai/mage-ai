import * as osPath from 'path';

export function getFilenameFromFilePath(filePath: string): string {
  const parts = filePath.split(osPath.sep);
  const filename = parts[parts.length - 1];
  return filename;
}
