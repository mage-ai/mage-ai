import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Text from '@oracle/elements/Text';
import {
  ButtonActionTypeEnum,
  CommandCenterActionType,
  CommandCenterItemType,
  ItemApplicationType,
  ItemApplicationTypeEnum,
  ItemTypeEnum,
  KeyValueType,
  ModeTypeEnum,
  ObjectTypeEnum,
} from '@interfaces/CommandCenterType';
import { InteractionInputTypeEnum } from '@interfaces/InteractionType';
import { InvokeRequestActionType } from './ItemApplication/constants';
import {
  KEY_SYMBOL_META,
  KEY_SYMBOL_PERIOD,
} from '@utils/hooks/keyboardShortcuts/constants';
import { OperationTypeEnum } from '@interfaces/PageComponentType';
import { getCurrentMode, getSetSettings } from '@storage/CommandCenter/utils';

export enum ItemRowClassNameEnum {
  FOCUSED = 'focused',
  ITEM_ROW = 'item-row',
  ITEM_ROW_CATEGORY = 'item-row-category',
}

export enum InputElementEnum {
  MAIN = 'main',
}

export type FetchItemsType = {
  fetchItems: (opts?: KeyValueType) => Promise<any>;
}

export type HandleSelectItemRowType = {
  handleSelectItemRow: (item: CommandCenterItemType, focusedItemIndex: number) => void;
}

export type ExecuteActionableType = {
  executeAction: (
    item: CommandCenterItemType,
    focusedItemIndex: number,
    actions?: CommandCenterActionType[],
  ) => Promise<any>;
}

export type ApplicationConfiguration = {
  application: ItemApplicationType;
  focusedItemIndex: number;
  item: CommandCenterItemType;
  itemsRef?: any;
} & InvokeRequestActionType & ExecuteActionableType;

export function getInputPlaceholder({
  application,
  item,
}: {
  application?: ItemApplicationType;
  item?: CommandCenterItemType;
} = {}) {
  const mode = getCurrentMode();

  if (mode) {
    if (ModeTypeEnum.VERSION_CONTROL === mode) {
      return 'Setup projects, clone branches, commit files, push code...';
    }
  } if (ItemApplicationTypeEnum.DETAIL_LIST === application?.application_type) {
    if (ObjectTypeEnum.PIPELINE === item?.object_type) {
      return `Search blocks and triggers in ${item?.title}`;
    } else if (ObjectTypeEnum.TRIGGER === item?.object_type) {
      return `Search runs or run ${item?.title || 'this'} trigger once`;
    }
  }

  return 'Search actions, apps, files, blocks, pipelines, triggers';
}

export function buildSettingsItemWithApplication(): {
  application: ItemApplicationType;
  item: CommandCenterItemType;
} {
  const settings = getSetSettings() || {};

  const application = {
    application_type: ItemApplicationTypeEnum.FORM,
    buttons: [
      {
        label: 'Cancel',
        keyboard_shortcuts: [['metaKey', 27]],
        action_types: [
          ButtonActionTypeEnum.RESET_FORM,
          ButtonActionTypeEnum.CLOSE_APPLICATION,
        ],
      },
      {
        label: 'Save settings',
        keyboard_shortcuts: [[13]],
        action_types: [
          ButtonActionTypeEnum.EXECUTE,
          ButtonActionTypeEnum.RESET_FORM,
          ButtonActionTypeEnum.CLOSE_APPLICATION,
        ],
      },
    ],
    uuid: 'command_center_settings',
    settings: [
      {
        label: 'Keyboard shortcut to launch',
        description: (
          <>
            <FlexContainer alignItems="center">
              <Text inline muted small>
                The default is&nbsp;&nbsp;
              </Text>

              <KeyboardTextGroup
                addPlusSignBetweenKeys
                inline
                keyTextGroups={[[KEY_SYMBOL_META, KEY_SYMBOL_PERIOD]]}
                monospace
              />

              <Text inline muted small>
                &nbsp;&nbsp;(<Text inline monospace muted small>
                  metaKey
                </Text> + <Text inline monospace muted small>period</Text>).
              </Text>
            </FlexContainer>

            <Text muted small>
              You can change this by entering
              <br />
              the desired key codes separated by commas.
            </Text>
          </>
        ),
        placeholder: 'e.g. metaKey, 190',
        display_settings: {
          icon_uuid: 'Alphabet',
        },
        name: 'request.payload.command_center_item.settings.interface.keyboard_shortcuts.main',
        type: InteractionInputTypeEnum.TEXT_FIELD,
        monospace: true,
        action_uuid: 'update_model',
        value: settings?.interface?.keyboard_shortcuts?.main?.join(', '),
      },
    ],
  };

  const item = {
    item_type: ItemTypeEnum.ACTION,
    object_type: ObjectTypeEnum.SETTINGS,
    title: 'Command center settings',
    description: 'Customize your command center.',
    applications: [
      application,
    ],
    actions: [
      {
        request: {
          operation: OperationTypeEnum.CREATE,
          payload: {
            command_center_item: null,
          },
          resource: 'command_center_items',
          response_resource_key: 'command_center_items',
        },
        uuid: 'update_model',
      },
    ],
    uuid: 'command_center_settings',
  };

  return {
    // @ts-ignore
    application,
    // @ts-ignore
    item,
  };
}
