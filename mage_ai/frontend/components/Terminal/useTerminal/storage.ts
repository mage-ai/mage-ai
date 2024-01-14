import { LOCAL_STORAGE_TERMINAL_UUIDS } from './constants';
import { get, set } from '@storage/localStorage';

export type CachedItem = {
  selected: boolean;
  uuid: string;
};

export function getUUIDs(): CachedItem[] {
  return get(LOCAL_STORAGE_TERMINAL_UUIDS, [])?.filter(({ uuid }) => !!uuid) as CachedItem[];
}

export function setUUIDs(uuids: CachedItem[], replace: boolean = true): CachedItem[] {
  let arr = uuids;
  if (!replace) {
    arr.push(...getUUIDs());
  }

  arr = arr?.filter(({ uuid }) => !!uuid);
  set(LOCAL_STORAGE_TERMINAL_UUIDS, arr);

  return arr;
}
