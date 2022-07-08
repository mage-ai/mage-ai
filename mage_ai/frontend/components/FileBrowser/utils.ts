import FileType from '@interface/FileType';

export function getFullPath(
  file: FileType,
  currentPathInit: string,
): string {
  const currentPath = currentPathInit || file?.name;

  if (file?.parent) {
    return getFullPath(file.parent, `${file.parent.name}/${currentPath}`);
  }

  return currentPath;
}
