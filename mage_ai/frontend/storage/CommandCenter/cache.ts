import { CommandCenterItemType } from '@interfaces/CommandCenterItemType';
import { LOCAL_STORAGE_COMMAND_CENTER_ITEMS } from './constants';
import { get, set } from '@storage/localStorage';
import { getPageHistoryAsItems } from './utils';
import { indexBy } from '@utils/array';

export function combineAndSetCachedItems(
  items: CommandCenterItemType[],
): CommandCenterItemType[] {
  const itemsUse = items || [];

  const mapping = indexBy(itemsUse || [], ({ uuid }) => uuid) || {};

  const cachedItems = (getCachedItems() || [])?.filter(({
    uuid,
  }) => !(uuid in mapping));

  // @ts-ignore
  const combined = (itemsUse || [])?.concat(cachedItems || []);

  setCachedItems(combined);

  // @ts-ignore
  return combined.concat(getPageHistoryAsItems() || []);
}

export function getCachedItemsUUIDs(): string[] {
  return (getCachedItems() || [])?.map(({
    uuid,
  }) => uuid);
}

function getCachedItems(): CommandCenterItemType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_ITEMS);
}

function setCachedItems(items: CommandCenterItemType[]) {
  set(LOCAL_STORAGE_COMMAND_CENTER_ITEMS, items);
}
