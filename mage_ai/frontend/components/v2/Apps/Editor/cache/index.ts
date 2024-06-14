import { FileType } from '../../../IDE/interfaces';
import { get, set } from '@storage/localStorage';
import { isJsonString } from '@utils/string';

const BASE_KEY = 'materia-ide';

function cacheKey(uuid: string): string {
  return `${BASE_KEY}-${uuid}`;
}

export function getItem(uuid: string): FileType | null {
  return get(cacheKey(uuid));
}

export function updateFile(file: FileType, serverFile?: FileType) {
  set(cacheKey(file.path), file);
}
