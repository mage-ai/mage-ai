import { 
  LOCAL_STORAGE_KEY_INCLUDE_SERVER_TIME_SECONDS, 
} from '@storage/constants';
import { get, setLocalStorageValue } from '@storage/localStorage';

export function shouldIncludeServerTimeSeconds(): boolean {
  return get(LOCAL_STORAGE_KEY_INCLUDE_SERVER_TIME_SECONDS, false);
}

export function storeIncludeServerTimeSeconds(value: boolean): boolean {
  return !!setLocalStorageValue(LOCAL_STORAGE_KEY_INCLUDE_SERVER_TIME_SECONDS, value);
}
