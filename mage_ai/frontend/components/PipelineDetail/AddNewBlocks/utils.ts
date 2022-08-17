import {
  ACTION_GROUPING_MAPPING,
  ACTION_TYPE_HUMAN_READABLE_MAPPING,
  ActionGroupingEnum,
} from '@interfaces/TransformerActionType';
import { ActionTypeEnum, AxisEnum } from '@interfaces/ActionPayloadType';
import { BlockRequestPayloadType, BlockTypeEnum } from '@interfaces/BlockType';
import DataSourceTypeEnum, {
  DATA_SOURCE_TYPES,
  DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING,
} from '@interfaces/DataSourceType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { addUnderscores } from '@utils/string';

export const createDataSourceMenuItems = (
  blockType: BlockTypeEnum,
  blockCallback: (block: BlockRequestPayloadType) => void,
) => (
  DATA_SOURCE_TYPES[blockType].map((sourceType: DataSourceTypeEnum) => ({
    indent: blockType === BlockTypeEnum.TRANSFORMER,
    label: () => DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING[sourceType],
    onClick: () => {
      blockCallback({
        config: {
          data_source: sourceType === DataSourceTypeEnum.GENERIC ? null : sourceType,
        },
        type: blockType,
      });
    },
    uuid: `${blockType}/${sourceType}`,
  }))
);

export function createActionMenuItems(
  actions: ActionTypeEnum[],
  axis: AxisEnum,
  blockCallback: (block: BlockRequestPayloadType) => void,
): FlyoutMenuItemType[] {
  return actions.map((action: ActionTypeEnum) => ({
    indent: true,
    label: () => ACTION_TYPE_HUMAN_READABLE_MAPPING[axis][action],
    onClick: () => {
      blockCallback({
        config: {
          action_type: action,
          axis,
        },
        type: BlockTypeEnum.TRANSFORMER,
      });
    },
    uuid: `${axis}_${action}`,
  })).sort((a, b) => (a.label()).localeCompare(b.label()));
}

export function createActionMenuGroupings(
  groupings: ActionGroupingEnum[],
  axis: AxisEnum,
  blockCallback: (block: BlockRequestPayloadType) => void,
): FlyoutMenuItemType[] {
  const menuItems: FlyoutMenuItemType[] = [];
  groupings.forEach((grouping: ActionGroupingEnum) => {
    if (grouping !== ActionGroupingEnum.MISC) {
      menuItems.push({
        indent: true,
        items: createActionMenuItems(
          ACTION_GROUPING_MAPPING[axis][grouping],
          axis,
          blockCallback,
        ),
        label: () => grouping,
        uuid: `${axis}_grouping_${addUnderscores(grouping)}`,
      });
    } else {
      const miscActionMenuItems = createActionMenuItems(
        ACTION_GROUPING_MAPPING[axis][grouping],
        axis,
        blockCallback,
      );
      menuItems.push(...miscActionMenuItems);
    }
  });

  return menuItems;
}
