import {
  CommandCenterItemType,
  CommandCenterTypeEnum,
  TYPE_TITLE_MAPPING,
} from '@interfaces/CommandCenterType';
import { indexBy } from '@utils/array';

export function filterItems(
  searchText: string,
  items: CommandCenterItemType[],
): CommandCenterItemType[] {
  if (!searchText) {
    return items;
  }

  const value = (searchText || '')?.toLowerCase();

  return (items || [])?.filter(({
    description,
    title,
  }) => title?.toLowerCase()?.includes(value) || description?.toLowerCase()?.includes(value));
}

export function combineLocalAndServerItems(
  itemsServer: CommandCenterItemType[],
  itemsLocal: CommandCenterItemType[],
): CommandCenterItemType[] {
  const mapping = indexBy(itemsServer || [], ({ uuid }) => uuid) || {};

  // @ts-ignore
  return (itemsServer || [])?.concat((itemsLocal || [])?.filter(({ uuid }) => !(uuid in mapping)));
}

export function getDisplayCategory(item: CommandCenterItemType): string {
  const {
    subtype,
    type,
  } = item;

  if (CommandCenterTypeEnum.APPLICATION === type && CommandCenterTypeEnum.SUPPORT === subtype) {
    return 'Reinforcements';
  }

  return TYPE_TITLE_MAPPING[type];
}
