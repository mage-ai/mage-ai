import {
  CommandCenterActionType,
  CommandCenterItemType,
  KeyValueType,
  TYPE_TITLE_MAPPING,
} from '@interfaces/CommandCenterType';
import { dig, setNested } from '@utils/hash';
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
  return TYPE_TITLE_MAPPING[item?.item_type];
}

export function updateActionFromUpstreamResults(
  action: CommandCenterActionType,
  results: KeyValueType,
): CommandCenterActionType {
  const {
    upstream_action_value_key_mapping: upstreamActionValueKeyMapping,
  } = action;

  let actionCopy = { ...action };

  if (upstreamActionValueKeyMapping) {
    Object.entries(upstreamActionValueKeyMapping || {})?.forEach(([
      actionUUID,
      mapping,
    ]) => {
      const result = results?.[actionUUID];
      if (result) {
        Object.entries(mapping || {})?.forEach(([
          parentKeyGetter,
          childKeySetter,
        ]) => {
          const value = dig(result, parentKeyGetter);
          setNested(actionCopy, childKeySetter, value);
        });
      }
    });
  }

  return actionCopy;
}
