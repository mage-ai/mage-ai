import { CommandCenterItemType } from '@interfaces/CommandCenterItemType';
import { LOCAL_STORAGE_COMMAND_CENTER_ITEMS } from './constants';
import { get, set } from '@storage/localStorage';
import { getPageHistoryAsItems } from './utils';
import { indexBy, unique } from '@utils/array';

export function getCachedItems(): CommandCenterItemType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_ITEMS);
}

export function addCachedItems(items: CommandCenterItemType[], opts: {
  filterCachedItems?: (items: CommandCenterItemType[]) => CommandCenterItemType[];
} = {}) {
  const mapping = indexBy(items || [], ({ uuid }) => uuid);
  let itemsCached = getCachedItems() || [];

  const filterCachedItems = opts?.filterCachedItems;
  if (filterCachedItems) {
    itemsCached = filterCachedItems(itemsCached);
  }

  // @ts-ignore
  const combined = (items || []).concat(itemsCached || []);

  const itemsUnique = unique(combined, ({ uuid }) => uuid);

  set(LOCAL_STORAGE_COMMAND_CENTER_ITEMS, itemsUnique);

  return itemsUnique;
}
