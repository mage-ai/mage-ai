import { CommandCenterItemType } from '@interfaces/CommandCenterItemType';
import { LOCAL_STORAGE_COMMAND_CENTER_ITEMS } from './constants';
import { get, set } from '@storage/localStorage';
import { getPageHistoryAsItems } from './utils';
import { indexBy } from '@utils/array';

export function getCachedItems(): CommandCenterItemType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_ITEMS);
}

export function addCachedItems(items: CommandCenterItemType[]) {
  const mapping = indexBy(items || [], ({ uuid }) => uuid);
  const itemsCached = getCachedItems() || [];

  set(
    LOCAL_STORAGE_COMMAND_CENTER_ITEMS,
    // @ts-ignore
    items.concat(itemsCached?.filter(({ uuid }) => !(uuid in mapping))),
  );
}
