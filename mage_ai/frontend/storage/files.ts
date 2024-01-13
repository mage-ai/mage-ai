import { ALL_SUPPORTED_FILE_EXTENSIONS_REGEX, FileExtensionEnum } from '@interfaces/FileType';
import { get, set } from './localStorage';
import { remove, removeAtIndex } from '@utils/array';

export const LOCAL_STORAGE_KEY_SHOW_HIDDEN_FILES = 'show_hidden_files';
const OPEN_FILES = 'open_files';

export function getOpenFilePaths(): string[] {
  return get(OPEN_FILES, []);
}

export function setOpenFilePaths(filePaths: string[]) {
  set(OPEN_FILES, filePaths);
}

export function addOpenFilePath(filePath: string): string[] {
  let arr = get(OPEN_FILES, []);

  const idx = arr?.indexOf(filePath);
  if (idx >= 0) {
    arr = removeAtIndex(arr, idx);
  }

  arr.unshift(filePath);

  setOpenFilePaths(arr);

  return arr;
}

export function removeOpenFilePath(filePath: string): string[] {
  const arr = get(OPEN_FILES, []);
  const arrNew = remove(arr, fp => fp === filePath);
  setOpenFilePaths(arrNew);

  return arrNew;
}

export function getFileExtension(filename: string): FileExtensionEnum {
  const match = filename?.match(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX);
  const fx = match?.length >= 1
    ? match[0].replace('.', '') as FileExtensionEnum
    : null;

  if ([FileExtensionEnum.YAML, FileExtensionEnum.YML].includes(fx)) {
    return FileExtensionEnum.YAML;
  }

  return fx;
}
