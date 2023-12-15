import * as osPath from 'path';

import FileType from '@interfaces/FileType';

export function getFullPath(
  file: FileType,
  currentPathInit: string = null,
  removeFilename: boolean = false,
): string {
  const currentPath = currentPathInit || (removeFilename ? null : file?.name);

  if (file?.parent) {
    const parts = [file.parent.name];
    if (currentPath?.length >= 1) {
      parts.push(currentPath);
    }
    return getFullPath(file.parent, parts.join(osPath.sep));
  }

  return currentPath;
}
