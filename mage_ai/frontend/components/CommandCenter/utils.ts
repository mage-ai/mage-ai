import { CommandCenterItemType } from '@interfaces/CommandCenterType';

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
