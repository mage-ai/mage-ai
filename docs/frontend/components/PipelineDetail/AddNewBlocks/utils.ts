import {
  ACTION_GROUPING_MAPPING,
  ACTION_TYPE_HUMAN_READABLE_MAPPING,
  ActionGroupingEnum,
} from '@interfaces/TransformerActionType';
import { ActionTypeEnum, AxisEnum } from '@interfaces/ActionPayloadType';
import {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  CONVERTIBLE_BLOCK_TYPES,
} from '@interfaces/BlockType';
import DataSourceTypeEnum, {
  DATA_SOURCE_TYPES,
  DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING,
} from '@interfaces/DataSourceType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { addUnderscores } from '@utils/string';

const getDataSourceTypes = (
  pipelineType?: PipelineTypeEnum,
): { [blockType in BlockTypeEnum]?: DataSourceTypeEnum[] } => {
  if (pipelineType === PipelineTypeEnum.STREAMING) {
    return {
      [BlockTypeEnum.DATA_LOADER]: [
        DataSourceTypeEnum.KAFKA,
        DataSourceTypeEnum.AZURE_EVENT_HUB,
      ],
      [BlockTypeEnum.DATA_EXPORTER]: [
        DataSourceTypeEnum.OPENSEARCH,
      ],
      [BlockTypeEnum.TRANSFORMER]: [
        DataSourceTypeEnum.GENERIC,
      ],
    };
  }

  return DATA_SOURCE_TYPES;
};

export const createDataSourceMenuItems = (
  blockType: BlockTypeEnum,
  blockCallback: (block: BlockRequestPayloadType) => void,
  pipelineType?: PipelineTypeEnum,
) => {
  const requiresConfigFile = (pipelineType === PipelineTypeEnum.STREAMING)
    && (blockType === BlockTypeEnum.DATA_LOADER || blockType === BlockTypeEnum.DATA_EXPORTER);

  return (getDataSourceTypes(pipelineType)[blockType])
    .map((sourceType: DataSourceTypeEnum) => ({
      indent: blockType === BlockTypeEnum.TRANSFORMER,
      label: () => DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING[sourceType],
      onClick: () => {
        blockCallback({
          config: {
            data_source: (sourceType === DataSourceTypeEnum.GENERIC) ? null : sourceType,
          },
          language: requiresConfigFile
            ? BlockLanguageEnum.YAML
            : BlockLanguageEnum.PYTHON,
          type: blockType,
        });
      },
      uuid: `${blockType}/${sourceType}`,
    }));
};

export const getNonPythonMenuItems = (
  addNewBlock: (block: BlockRequestPayloadType) => void,
  blockType: BlockTypeEnum,
) => ([
  {
    label: () => 'SQL',
    onClick: () => addNewBlock({
      language: BlockLanguageEnum.SQL,
      type: blockType,
    }),
    uuid: `${blockType}/sql`,
  },
  {
    label: () => 'R',
    onClick: () => addNewBlock({
      language: BlockLanguageEnum.R,
      type: blockType,
    }),
    uuid: `${blockType}/r`,
  },
]);

export const getdataSourceMenuItems = (
  addNewBlock: (block: BlockRequestPayloadType) => void,
  blockType: BlockTypeEnum,
  pipelineType?: PipelineTypeEnum,
) => {
  const dataSourceMenuItemsMapping = Object.fromEntries(CONVERTIBLE_BLOCK_TYPES.map(
      (blockType: BlockTypeEnum) => ([
        blockType,
        createDataSourceMenuItems(blockType, addNewBlock, pipelineType),
      ]),
    ),
  );

  if (pipelineType === PipelineTypeEnum.PYSPARK
    || (pipelineType === PipelineTypeEnum.PYTHON && blockType === BlockTypeEnum.TRANSFORMER)
    || (pipelineType === PipelineTypeEnum.STREAMING)) {
    return dataSourceMenuItemsMapping[blockType];
  } else {
    return [
      {
        items: dataSourceMenuItemsMapping[blockType],
        label: () => 'Python',
        uuid: `${blockType}/python`,
      },
      ...getNonPythonMenuItems(addNewBlock, blockType),
    ];
  }
};

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
        language: BlockLanguageEnum.PYTHON,
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
