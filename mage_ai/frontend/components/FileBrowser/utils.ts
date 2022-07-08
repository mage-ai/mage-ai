import FileType, { FileExtensionEnum } from '@interfaces/FileType';
import { BLOCK_TYPES } from '@interfaces/BlockType';
import { singularize } from '@utils/string';

export function getFullPath(
  file: FileType,
  currentPathInit: string = null,
): string {
  const currentPath = currentPathInit || file?.name;

  if (file?.parent) {
    return getFullPath(file.parent, `${file.parent.name}/${currentPath}`);
  }

  return currentPath;
}

export function getBlockFromFile(
  file: FileType,
  currentPathInit: string = null,
) {
  const parts = getFullPath(file, currentPathInit).split('/');
  // This assumes path default_repo/[block_type]s/..
  const blockType = singularize(parts[1]);
  const fileName = parts[parts.length - 1];

  const pyRegex = new RegExp(`\.${FileExtensionEnum.PY}$`);
  if (BLOCK_TYPES.includes(blockType) && fileName.match(pyRegex)) {
    return {
      type: blockType,
      uuid: fileName.replace(pyRegex, ''),
    };
  }
}
