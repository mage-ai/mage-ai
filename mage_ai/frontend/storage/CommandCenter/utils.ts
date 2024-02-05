import * as osPath from 'path';

import {
  CommandCenterItemType,
  CommandCenterSearchHistoryType,
  ItemTagEnum,
  ItemTypeEnum,
  ModeType,
  ObjectTypeEnum,
  PageHistoryType,
} from '@interfaces/CommandCenterType';
import {
  LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PAGES,
  LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PICKS,
  LOCAL_STORAGE_COMMAND_CENTER_HISTORY_SEARCHES,
  LOCAL_STORAGE_COMMAND_CENTER_ITEMS,
  LOCAL_STORAGE_COMMAND_CENTER_MODE,
  LOCAL_STORAGE_COMMAND_CENTER_SETTINGS,
} from './constants';
import {
  DATE_FORMAT_FULL,
  TIME_FORMAT_NO_SEC,
  dateFromFromUnixTimestamp,
  momentInLocalTimezone,
} from '@utils/date';
import { get, set } from '@storage/localStorage';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { unique } from '@utils/array';

export function getSetLayout(settings = null) {
  const data = {
    ...(get(LOCAL_STORAGE_COMMAND_CENTER_SETTINGS, settings) || {}),
    ...(settings || {}),
  };

  if (settings) {
    set(LOCAL_STORAGE_COMMAND_CENTER_SETTINGS, data);
  }

  return data;
}

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
    getSetSettings()?.history?.searches?.size || 0,
  ));

  return arr;
}

export function getPageHistory(): PageHistoryType[] {
  return get(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PAGES, []);
}

export function getPageHistoryAsItems(): CommandCenterItemType[] {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  return (getPageHistory() || [])?.map(({
    path,
    pathname,
    query,
    timestamp,
    title,
  }: PageHistoryType, idx: number) => {
    let description = pathname?.[0] === osPath.sep
      ? pathname?.slice(1, pathname?.length || 0)
      : pathname;

    if (timestamp) {
      const dt = momentInLocalTimezone(
        dateFromFromUnixTimestamp(timestamp),
        displayLocalTimezone,
      );

      description =
        `recently opened on ${dt?.format(DATE_FORMAT_FULL)} at ${dt?.format(TIME_FORMAT_NO_SEC)}`;
    }

    return {
      uuid: path,
      item_type: ItemTypeEnum.NAVIGATE,
      object_type: ObjectTypeEnum.APPLICATION,
      title,
      description,
      tags: [
        ItemTagEnum.RECENT,
      ],
      actions: [
        {
          page: {
            path,
          },
          uuid: path,
        },
      ],
      metadata: {
        page: {
          path,
          pathname,
          query,
          timestamp,
          title,
        },
      },
      display_settings_by_attribute: {
        description: {
          text_styles: {
            small: true,
          },
        },
      },
    };
  });
}

export function addPageHistory(page: PageHistoryType) {
  // @ts-ignore
  const arr: PageHistoryType[] = [{
    ...page,
    timestamp: Number(new Date()) / 1000,
  }];
  arr.push(...(getPageHistory() || []).filter(({ path }) => path !== page?.path));

  set(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PAGES, arr.slice(
    0,
    getSetSettings()?.history?.pages?.size || 0,
  ));

  return arr;
}

export function combineUnique(itemsSets: CommandCenterItemType[][]) {
  // @ts-ignore
  const combined = itemsSets?.reduce((acc, items) => acc.concat(items || []), []);
  return unique(combined, ({ uuid }) => uuid);
}

function buildPickKey(item: CommandCenterItemType): string {
  return [
    item?.item_type || '',
    item?.object_type || '',
    item?.tags?.join(',') || '',
  ].join(':')
}

export function getPicksHistory(): string {
  return get(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PICKS, '');
}

export function addPickHistory(item: CommandCenterItemType): string {
  const delimiter = '\t';
  const value = (getPicksHistory() || '');
  const parts = (value?.split(delimiter) || [])?.slice(
    0,
    (getSetSettings()?.history?.picks?.size || 1) - 1,
  );

  const key = buildPickKey(item);
  // @ts-ignore
  const final = [key].concat(parts)?.join(delimiter);

  set(LOCAL_STORAGE_COMMAND_CENTER_HISTORY_PICKS, final);

  return final;
}

export function setMode(mode: ModeType) {
  // Clear cache so that only items in the mode are cached.
  set(LOCAL_STORAGE_COMMAND_CENTER_ITEMS, []);
  set(LOCAL_STORAGE_COMMAND_CENTER_MODE, mode || null);
}

export function getCurrentMode(): ModeType {
  return get(LOCAL_STORAGE_COMMAND_CENTER_MODE);
}
