import { CommandCenterItemType } from '@interfaces/CommandCenterItemType';
import { LOCAL_STORAGE_COMMAND_CENTER_ITEMS } from './constants';
import { combineUnique, getPageHistoryAsItems } from './utils';
import { get, set } from '@storage/localStorage';
import { ignoreKeys } from '@utils/hash';
import { indexBy } from '@utils/array';

export function getCachedItems(): CommandCenterItemType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_ITEMS);
}

export function addCachedItems(items: CommandCenterItemType[], opts: {
  filterCachedItems?: (items: CommandCenterItemType[]) => CommandCenterItemType[];
} = {}) {
  const mapping = indexBy(items || [], ({ uuid }) => uuid);
  const itemsCached = getCachedItems() || [];

  const itemsUnique = combineUnique([
    items || [],
    itemsCached || [],
  ]);

  set(
    LOCAL_STORAGE_COMMAND_CENTER_ITEMS,
    itemsUnique?.map(item => ignoreKeys(item, ['score'])).slice(0, 300),
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
