import { CommandCenterItemType } from '@interfaces/CommandCenterType';
import { LOCAL_STORAGE_COMMAND_CENTER_ITEMS } from './constants';
import { combineUnique, getCurrentMode, getPageHistoryAsItems } from './utils';
import { get, set } from '@storage/localStorage';
import { ignoreKeys } from '@utils/hash';
import { indexBy } from '@utils/array';

export function getCachedItems(): CommandCenterItemType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_ITEMS);
}

export function addCachedItems(items: CommandCenterItemType[], opts: {
  filterCachedItems?: (items: CommandCenterItemType[]) => CommandCenterItemType[];
} = {}) {
  if (getCurrentMode()?.disable_cache_items) {
    return items;
  }

  const mapping = indexBy(items || [], ({ uuid }) => uuid);
  const itemsCached = getCachedItems() || [];

  const itemsUnique = combineUnique([
    items || [],
    itemsCached || [],
  ]);

  const now = Number(new Date()) / 1000;
  set(
    LOCAL_STORAGE_COMMAND_CENTER_ITEMS,
    itemsUnique?.filter(({
      settings,
    }) => typeof settings?.cache_expires_at === 'undefined'
      || settings?.cache_expires_at === null
      || settings?.cache_expires_at > now
    )?.map(item => ignoreKeys(item, ['score'])).slice(0, 300),
  );

  const filterCachedItems = opts?.filterCachedItems;
  if (filterCachedItems) {
    return combineUnique([
      items || [],
      filterCachedItems(itemsCached || []) || [],
    ]);
  }

  return itemsUnique;
}
