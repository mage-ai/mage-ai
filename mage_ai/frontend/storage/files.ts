import { get, set } from './localStorage';
import { remove } from '@utils/array';

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
