import BlockTemplateType from '@interfaces/BlockTemplateType';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import {
  ACTION_GROUPING_MAPPING,
  ACTION_TYPE_HUMAN_READABLE_MAPPING,
  ActionGroupingEnum,
} from '@interfaces/TransformerActionType';
import { ActionTypeEnum, AxisEnum } from '@interfaces/ActionPayloadType';
import { Add } from '@oracle/icons';
import BlockType, {
  BlockColorEnum,
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
import { addUnderscores, capitalize } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

const getDataSourceTypes = (
  pipelineType?: PipelineTypeEnum,
): { [blockType in BlockTypeEnum]?: DataSourceTypeEnum[] } => {
  if (pipelineType === PipelineTypeEnum.STREAMING) {
    return {
      [BlockTypeEnum.DATA_LOADER]: [
        DataSourceTypeEnum.AMAZON_SQS,
        DataSourceTypeEnum.AZURE_EVENT_HUB,
        DataSourceTypeEnum.KAFKA,
        DataSourceTypeEnum.KINESIS,
        DataSourceTypeEnum.RABBITMQ,
      ],
      [BlockTypeEnum.DATA_EXPORTER]: [
        DataSourceTypeEnum.DUMMY,
        DataSourceTypeEnum.S3,
        DataSourceTypeEnum.KAFKA,
        DataSourceTypeEnum.KINESIS,
        DataSourceTypeEnum.MONGODB,
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

  return (getDataSourceTypes(pipelineType)[blockType] || [])
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

export function groupBlockTemplates(
  blockTemplates: BlockTemplateType[],
  addNewBlock,
) {
  const mapping = {};

  blockTemplates?.forEach(({
    block_type: blockType,
    description,
    groups,
    language,
    name,
    path,
  }) => {
    if (!mapping[blockType]) {
      mapping[blockType] = {};
    }

    if (!mapping[blockType][language]) {
      mapping[blockType][language] = {
        items: [],
        label: () => language,
        uuid: `${blockType}/${language}`,
      };
    }

    const newItem = {
      label: () => name,
      onClick: () =>addNewBlock({
        config: {
          template_path: path,
        },
        language,
        type: blockType,
      }),
      tooltip: () => description,
      uuid: path,
    };

    if (groups?.length >= 1) {
      const obj = {
        ...mapping[blockType][language],
      };

      const groupIndexes = [null];
      const arr = [obj];

      groups.forEach((group: string, idx1: number) => {
        const uuid = `${blockType}/${language}/${groups.slice(0, idx1 + 1).join('/')}`;
        const o = arr[idx1];

        const itemGroupIndex = o.items.findIndex(({ uuid: uuid2 }) => uuid === uuid2);
        let itemGroup = itemGroupIndex >= 0 ? o.items[itemGroupIndex] : null;
        if (!itemGroup) {
          itemGroup = {
            items: [],
            label: () => group,
            uuid,
          };
        }

        groupIndexes.push(itemGroupIndex);
        arr.push(itemGroup);
      });

      groupIndexes.push(-1);
      arr.push(newItem);

      const arrLength = arr.length;

      mapping[blockType][language] = arr.reduce((acc, item, idx: number) => {
        const idxReverse = arrLength - idx;

        const parent = arr[idxReverse - 2];
        const child = arr[idxReverse - 1];
        const childIdx = groupIndexes[idxReverse - 1];

        if (parent) {
          if (childIdx >= 0) {
            parent.items[childIdx] = child;
          } else {
            parent.items.push(child);
          }

          return parent;
        }

        return child;
      }, {});
    } else {
      mapping[blockType][language].items.push(newItem);
    }
  });

  return mapping;
}

export const getdataSourceMenuItems = (
  addNewBlock: (block: BlockRequestPayloadType) => void,
  blockType: BlockTypeEnum,
  pipelineType?: PipelineTypeEnum,
  opts?: {
    blockTemplatesByBlockType?: {
      [blockType: string]: {
        [language: string]: FlyoutMenuItemType;
      }
    };
  },
) => {
  const blockTemplatesByBlockType = opts?.blockTemplatesByBlockType;

  const dataSourceMenuItemsMapping = Object.fromEntries(CONVERTIBLE_BLOCK_TYPES.map(
      (blockType: BlockTypeEnum) => ([
        blockType,
        createDataSourceMenuItems(blockType, addNewBlock, pipelineType),
      ]),
    ),
  );

  if (pipelineType === PipelineTypeEnum.PYSPARK
    || (pipelineType === PipelineTypeEnum.PYTHON && blockType === BlockTypeEnum.TRANSFORMER)
    || (pipelineType === PipelineTypeEnum.STREAMING)
    || (blockType === BlockTypeEnum.SENSOR)) {
    return dataSourceMenuItemsMapping[blockType];
  } else {
    const additionalTemplates =
      blockTemplatesByBlockType?.[blockType]?.[BlockLanguageEnum.PYTHON]?.items || [];

    return [
      {
        // @ts-ignore
        items: dataSourceMenuItemsMapping[blockType].concat(additionalTemplates),
        label: () => 'Python',
        uuid: `${blockType}/${BlockLanguageEnum.PYTHON}`,
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

export const createColorMenuItems = (
  addNewBlock: (block: BlockRequestPayloadType) => void,
  blockType: BlockTypeEnum,
  language: BlockLanguageEnum,
) => Object.values(BlockColorEnum)
  .map(color => ({
    label: () => (
      <FlexContainer alignItems="center">
        <Add
          fill={getColorsForBlockType(
            BlockTypeEnum.CUSTOM,
            { blockColor: color },
          ).accent}
          size={16}
        />
        &nbsp;
        <Text>
          {capitalize(color)}
        </Text>
      </FlexContainer>
    ),
    leftAligned: true,
    onClick: () => {
      addNewBlock({
        color,
        language,
        type: blockType,
      });
    },
    uuid: `${language}_${color}`,
  }));

export const addSqlBlockNote = (content: string) => (
  `-- Docs: https://docs.mage.ai/guides/sql-blocks
` + (content || '')
);

export function addScratchpadNote(
  block: BlockType,
  content?: string,
) {
  let updatedContent = content;
  if (BlockTypeEnum.SCRATCHPAD === block.type) {
    updatedContent = `"""
NOTE: Scratchpad blocks are used only for experimentation and testing out code.
The code written here will not be executed as part of the pipeline.
"""
` + (content || '');
  }

  return updatedContent;
}
