import { 
  LOCAL_STORAGE_KEY_DISPLAY_LOCAL_SERVER_TIME, 
  LOCAL_STORAGE_KEY_INCLUDE_SERVER_TIME_SECONDS, 
} from '@storage/constants';
import { get, setLocalStorageValue } from '@storage/localStorage';

export function shouldDisplayLocalServerTime(): boolean {
  return get(LOCAL_STORAGE_KEY_DISPLAY_LOCAL_SERVER_TIME, false);
}

export function storeDisplayLocalServerTime(value: boolean): boolean {
  return setLocalStorageValue(LOCAL_STORAGE_KEY_DISPLAY_LOCAL_SERVER_TIME, value);
}

export function shouldIncludeServerTimeSeconds(): boolean {
  return get(LOCAL_STORAGE_KEY_INCLUDE_SERVER_TIME_SECONDS, false);
}

export function storeIncludeServerTimeSeconds(value: boolean): boolean {
  return setLocalStorageValue(LOCAL_STORAGE_KEY_INCLUDE_SERVER_TIME_SECONDS, value);
}
