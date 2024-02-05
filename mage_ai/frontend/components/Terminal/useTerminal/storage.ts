import { CachedItemType } from './constants';
import { LOCAL_STORAGE_TERMINAL_ITEMS } from './constants';
import { get, set } from '@storage/localStorage';

export function getItems(): CachedItemType[] {
  return get(LOCAL_STORAGE_TERMINAL_ITEMS, [])?.filter(({ uuid }) => !!uuid) as CachedItemType[];
}

export function setItems(items: CachedItemType[], replace: boolean = true): CachedItemType[] {
  let arr = items;
  if (!replace) {
    arr.push(...getItems());
  }

  arr = arr?.filter(i => !!i?.uuid);
  set(LOCAL_STORAGE_TERMINAL_ITEMS, arr);

  return arr;
}
