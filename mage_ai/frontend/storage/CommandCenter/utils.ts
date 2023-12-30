import * as osPath from 'path';

import {
  CommandCenterItemType,
  CommandCenterSearchHistoryType,
  ItemTypeEnum,
  ObjectTypeEnum,
  PageHistoryType,
} from '@interfaces/CommandCenterType';
import {
  LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PAGES,
  LOCAL_STORAGE_COMMAND_CENTER_HISTORY_SEARCHES,
  LOCAL_STORAGE_COMMAND_CENTER_SETTINGS,
  MAX_ITEMS_HISTORY_PAGES,
  MAX_ITEMS_HISTORY_SEARCHES,
} from './constants';
import {
  DATE_FORMAT_FULL,
  TIME_FORMAT_NO_SEC,
  dateFromFromUnixTimestamp,
  momentInLocalTimezone,
} from '@utils/date';
import { get, set } from '@storage/localStorage';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

export function getSetSettings(settings = null) {
  const data = {
    ...(get(LOCAL_STORAGE_COMMAND_CENTER_SETTINGS, settings) || {}),
    ...(settings || {}),
  };

  if (settings) {
    set(LOCAL_STORAGE_COMMAND_CENTER_SETTINGS, data);
  }

  return data;
}

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

  set(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_SEARCHES, arr.slice(
    0,
    getSetSettings()?.history?.searches?.length || MAX_ITEMS_HISTORY_SEARCHES,
  ));

  return arr;
}

export function getPageHistory(): PageHistoryType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PAGES, []);
}

export function getPageHistoryAsItems(): CommandCenterItemType[] {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  return (getPageHistory() || [])?.map(({
    asPath,
    pathname,
    timestamp,
    title,
  }: PageHistoryType) => {
    let description = pathname?.[0] === osPath.sep
      ? pathname?.slice(1, pathname?.length || 0)
      : pathname;

    if (timestamp) {
      const dt = momentInLocalTimezone(
        dateFromFromUnixTimestamp(timestamp, {
          withMilliseconds: true,
        }),
        displayLocalTimezone,
      );

      description =
        `opened on ${dt?.format(DATE_FORMAT_FULL)} at ${dt?.format(TIME_FORMAT_NO_SEC)}`;
    }

    return {
      uuid: `${asPath}-${description}`,
      item_type: ItemTypeEnum.NAVIGATE,
      object_type: ObjectTypeEnum.APPLICATION,
      title,
      description,
      actions: [
        {
          page: {
            path: asPath,
          },
          uuid: asPath,
        },
      ],
      metadata: {
        action_timestamp: timestamp,
      },
    };
  });
}

export function addPageHistory(page: PageHistoryType) {
  // @ts-ignore
  const arr: PageHistoryType[] = [{
    ...page,
    timestamp: Number(new Date()),
  }].concat(
    (getPageHistory() || []).filter(({ asPath }) => asPath !== page?.asPath)
  );

  set(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PAGES, arr.slice(
    0,
    getSetSettings()?.history?.pages?.length || MAX_ITEMS_HISTORY_PAGES,
  ));

  return arr;
}
