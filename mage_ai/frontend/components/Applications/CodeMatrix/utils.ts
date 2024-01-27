import { BlockLanguageEnum } from '@interfaces/BlockType';
import { LOCAL_STORAGE_CODE_MATRIX_CONTENT } from './constants';
import { get, set } from '@storage/localStorage';
import { isObject } from '@utils/hash';

export function getCodeCached(language: BlockLanguageEnum = null): string | {
  [language: string]: string;
} {
  const mapping = get(LOCAL_STORAGE_CODE_MATRIX_CONTENT) || {};

  if (language) {
    return mapping?.[language];
  }

  return mapping;
}

export function setCodeCached(language: BlockLanguageEnum, code: string): string {
  const prev = (getCodeCached() || {});
  const data = {
    ...(isObject(prev) ? prev as { [language: string]: string } : {}),
    [language]: code,
  };

  set(LOCAL_STORAGE_CODE_MATRIX_CONTENT, data);

  return data?.[language];
}
