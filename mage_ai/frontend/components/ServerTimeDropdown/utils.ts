import { 
  LOCAL_STORAGE_KEY_DISPLAY_LOCAL_SERVER_TIME, LOCAL_STORAGE_KEY_INCLUDE_SERVER_TIME_SECONDS, 
} from '@storage/constants';
import { get, set } from '@storage/localStorage';

function getLocalStorageValue(storageKey: string): boolean {
  const storageValue = get(storageKey, null);

  return storageValue || false;
}

function setLocalStorageValue(storageKey: string, value: boolean): boolean {
  if (typeof value !== 'undefined') {
    set(storageKey, value);
  }

  return value;
}

export function shouldDisplayLocalServerTime(): boolean {
  return getLocalStorageValue(LOCAL_STORAGE_KEY_DISPLAY_LOCAL_SERVER_TIME);
}

export function storeDisplayLocalServerTime(value: boolean): boolean {
  return setLocalStorageValue(LOCAL_STORAGE_KEY_DISPLAY_LOCAL_SERVER_TIME, value);
}

export function shouldIncludeServerTimeSeconds(): boolean {
  return getLocalStorageValue(LOCAL_STORAGE_KEY_INCLUDE_SERVER_TIME_SECONDS);
}

export function storeIncludeServerTimeSeconds(value: boolean): boolean {
  return setLocalStorageValue(LOCAL_STORAGE_KEY_INCLUDE_SERVER_TIME_SECONDS, value);
}
