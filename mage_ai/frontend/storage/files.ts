import { get, set } from './localStorage';
import { remove } from '@utils/array';

export const LOCAL_STORAGE_KEY_SHOW_HIDDEN_FILES = 'show_hidden_files';
const OPEN_FILES = 'open_files';

export function getOpenFilePaths(): string[] {
  return get(OPEN_FILES, []);
}

export function setOpenFilePaths(filePaths: string[]) {
  set(OPEN_FILES, filePaths);
}

export function addOpenFilePath(filePath: string): string[] {
  const arr = get(OPEN_FILES, []);

  if (!arr.includes(filePath)) {
    arr.push(filePath);
  }

  setOpenFilePaths(arr);

  return arr;
}

export function removeOpenFilePath(filePath: string): string[] {
  const arr = get(OPEN_FILES, []);
  const arrNew = remove(arr, fp => fp === filePath);
  setOpenFilePaths(arrNew);

  return arrNew;
}
