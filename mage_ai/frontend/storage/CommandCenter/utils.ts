import {
  CommandCenterItemType,
  CommandCenterSearchHistoryType,
  CommandCenterTypeEnum,
  PageHistoryType,
} from '@interfaces/CommandCenterType';
import { ITEMS } from '@components/CommandCenter/mocks';
import {
  LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PAGES,
  LOCAL_STORAGE_COMMAND_CENTER_HISTORY_SEARCHES,
  MAX_ITEMS_HISTORY_PAGES,
  MAX_ITEMS_HISTORY_SEARCHES,
} from './constants';
import { get, set } from '@storage/localStorage';

export function getSearchHistory(): CommandCenterSearchHistoryType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_SEARCHES, []);
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

  set(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_SEARCHES, arr.slice(0, MAX_ITEMS_HISTORY_SEARCHES));

  return arr;
}

export function getPageHistory(): PageHistoryType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PAGES, []);
}

export function getPageHistoryAsItems(): CommandCenterItemType[] {
  return (getPageHistory() || [])?.map(({
    asPath,
    pathname,
    title,
  }: PageHistoryType) => ({
    actions: [
      {
        page: {
          path: asPath,
        },
      },
    ],
    description: pathname,
    title,
    type: CommandCenterTypeEnum.APPLICATION,
    uuid: asPath,
  }));
}

export function addPageHistory(page: PageHistoryType) {
  // @ts-ignore
  const arr: PageHistoryType[] = [page].concat(
    (getPageHistory() || []).filter(({ asPath }) => asPath !== page?.asPath)
  );

  set(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PAGES, arr.slice(0, MAX_ITEMS_HISTORY_PAGES));

  return arr;
}

export function fetchItems(): CommandCenterItemType[] {
  // @ts-ignore
  return (getPageHistoryAsItems() || []).concat(ITEMS);
}
