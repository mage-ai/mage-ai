import {
  ButtonActionType,
  ButtonActionTypeEnum,
  CommandCenterActionType,
  CommandCenterItemType,
  KeyValueType,
  OBJECT_TITLE_MAPPING_SHORT,
  TYPE_TITLE_MAPPING,
  TYPE_TITLE_MAPPING_NORMAL,
} from '@interfaces/CommandCenterType';
import { CUSTOM_EVENT_NAME_COMMAND_CENTER } from '@utils/events/constants';
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

export function getDisplayCategory(item: CommandCenterItemType, normal: boolean = false): string {
  if (normal) {
    return [
      TYPE_TITLE_MAPPING_NORMAL[item?.item_type],
      OBJECT_TITLE_MAPPING_SHORT[item?.object_type],
    ].join(' ');
  }
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

export function executeButtonActions({
  button,
  executeAction,
  focusedItemIndex,
  item,
  refError,
  removeApplication,
}: {
  button: ButtonActionType;
  executeAction: (item: CommandCenterItemType, focusedItemIndex: number) => Promise<any>;
  focusedItemIndex: number;
  item: CommandCenterItemType;
  removeApplication: () => void;
}) {
  const actionTypes = button?.action_types || [];

  const invokeActionAndCallback = (index: number, results: KeyValueType = {}) => {
    const actionType = actionTypes?.[index];

    let actionFunction = (result: KeyValueType = {}) => {};

    if (ButtonActionTypeEnum.RESET_FORM === actionType) {
      if (typeof window !== 'undefined') {
        const eventCustom = new CustomEvent(CUSTOM_EVENT_NAME_COMMAND_CENTER, {
          detail: {
            actionType: 'reset_form',
            item,
          },
        });

        actionFunction = (result: KeyValueType = {}) => window.dispatchEvent(eventCustom);
      }
    } else if (ButtonActionTypeEnum.EXECUTE === actionType) {
      actionFunction = (result: KeyValueType = {}) => executeAction(item, focusedItemIndex);
    } else if (ButtonActionTypeEnum.CLOSE_APPLICATION === actionType) {
      actionFunction = (result: KeyValueType = {}) => removeApplication();
    }

    const result = new Promise((resolve, reject) => resolve(actionFunction(results)));

    return result?.then((resultsInner) => {
      if (index + 1 <= actionTypes?.length - 1 && !refError?.current) {
        return invokeActionAndCallback(index + 1, {
          ...(results || {}),
          ...(resultsInner || {}),
        });
      }
    });
  };

  if (actionTypes?.length >= 1) {
    return invokeActionAndCallback(0);
  }
}
