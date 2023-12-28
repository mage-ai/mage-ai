import { CommandCenterItemType, CommandCenterSearchHistoryType } from '@interfaces/CommandCenterType';
import {
  LOCAL_STORAGE_COMMAND_CENTER_HISTORY_SEARCH,
  MAX_ITEMS_HISTORY_SEARCH,
} from './constants';
import { get, set } from '@storage/localStorage';

export function getSearchHistory(): CommandCenterSearchHistoryType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_SEARCH, []);
}

export function addSearchHistory(
  searchText: string,
  item: CommandCenterItemType,
  items: CommandCenterItemType[],
): CommandCenterSearchHistoryType[] {
  const arr: CommandCenterSearchHistoryType[] = getSearchHistory();

  if (searchText !== arr?.[0]?.searchText) {
    arr.unshift({
      item,
      items,
      searchText,
    });
  }

  set(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_SEARCH, arr.slice(0, MAX_ITEMS_HISTORY_SEARCH));

  return arr;
}
