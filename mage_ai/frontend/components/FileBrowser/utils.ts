import FileType from '@interface/FileType';

export function getFullPath(currentPath: string, parentFile: FileType) {
  if (parentFile.name)
  return `${}/${currentPath}`
}
