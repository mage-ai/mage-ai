import BlockTemplateType, { DataIntegrationTypeEnum } from '@interfaces/BlockTemplateType';
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
import { sortByKey } from '@utils/array';

const getDataSourceTypes = (
  pipelineType?: PipelineTypeEnum,
): { [blockType in BlockTypeEnum]?: DataSourceTypeEnum[] } => {
  if (pipelineType === PipelineTypeEnum.STREAMING) {
    return {
      [BlockTypeEnum.DATA_LOADER]: [
        DataSourceTypeEnum.GENERIC,
        DataSourceTypeEnum.ACTIVEMQ,
        DataSourceTypeEnum.AMAZON_SQS,
        DataSourceTypeEnum.AZURE_EVENT_HUB,
        DataSourceTypeEnum.GOOGLE_CLOUD_PUBSUB,
        DataSourceTypeEnum.INFLUXDB,
        DataSourceTypeEnum.KAFKA,
        DataSourceTypeEnum.NATS,
        DataSourceTypeEnum.KINESIS,
        DataSourceTypeEnum.RABBITMQ,
        DataSourceTypeEnum.MONGODB
      ],
      [BlockTypeEnum.DATA_EXPORTER]: [
        DataSourceTypeEnum.GENERIC,
        DataSourceTypeEnum.ACTIVEMQ,
        DataSourceTypeEnum.AZURE_DATA_LAKE,
        DataSourceTypeEnum.BIGQUERY,
        DataSourceTypeEnum.CLICKHOUSE,
        DataSourceTypeEnum.DUCKDB,
        DataSourceTypeEnum.DUMMY,
        DataSourceTypeEnum.ELASTICSEARCH,
        DataSourceTypeEnum.GOOGLE_CLOUD_PUBSUB,
        DataSourceTypeEnum.GOOGLE_CLOUD_STORAGE,
        DataSourceTypeEnum.INFLUXDB,
        DataSourceTypeEnum.S3,
        DataSourceTypeEnum.KAFKA,
        DataSourceTypeEnum.KINESIS,
        DataSourceTypeEnum.MONGODB,
        DataSourceTypeEnum.MSSQL,
        DataSourceTypeEnum.MYSQL,
        DataSourceTypeEnum.OPENSEARCH,
        DataSourceTypeEnum.ORACLEDB,
        DataSourceTypeEnum.POSTGRES,
        DataSourceTypeEnum.RABBITMQ,
        DataSourceTypeEnum.REDSHIFT,
        DataSourceTypeEnum.SNOWFLAKE,
        DataSourceTypeEnum.TRINO,
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
          language: (requiresConfigFile && sourceType !== DataSourceTypeEnum.GENERIC)
            ? BlockLanguageEnum.YAML
            : BlockLanguageEnum.PYTHON,
          type: blockType,
        });
      },
      uuid: `${blockType}/${sourceType}`,
    }));
};

function SQLMenuItems(
  addNewBlock: (block: BlockRequestPayloadType) => void,
  blockType: BlockTypeEnum,
) {
  return {
    label: () => 'SQL',
    onClick: () => addNewBlock({
      language: BlockLanguageEnum.SQL,
      type: blockType,
    }),
    uuid: `${blockType}/sql`,
  };
}

function RMenuItems(
  addNewBlock: (block: BlockRequestPayloadType) => void,
  blockType: BlockTypeEnum,
) {
  return {
    label: () => 'R',
    onClick: () => addNewBlock({
      language: BlockLanguageEnum.R,
      type: blockType,
    }),
    uuid: `${blockType}/r`,
  };
}

export const getNonPythonMenuItems = (
  addNewBlock: (block: BlockRequestPayloadType) => void,
  blockType: BlockTypeEnum,
) => ([
  SQLMenuItems(addNewBlock, blockType),
  RMenuItems(addNewBlock, blockType),
]);

export function groupBlockTemplates(
  blockTemplates: BlockTemplateType[],
  addNewBlock,
  uuidsToHideTooltips?: { [key: string]: boolean },
) {
  const mapping = {};

  blockTemplates?.forEach(({
    block_type: blockType,
    configuration,
    defaults,
    description,
    groups,
    language,
    name,
    path,
    template_type: templateType,
    template_variables: templateVariables,
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

    const newItem: FlyoutMenuItemType = {
      label: () => name,
      onClick: () => addNewBlock({
        config: {
          template_path: path,
          template_type: templateType,
          template_variables: templateVariables,
        },
        configuration,
        defaults,
        language,
        type: blockType,
      }),
      uuid: `${path}/${name}`,
    };

    if (!uuidsToHideTooltips?.[path]) {
      newItem.tooltip = () => description;
    }

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
      };
    };
    dataIntegrationType?: DataIntegrationTypeEnum;
    languages?: BlockLanguageEnum[];
    onlyCustomTemplate?: boolean;
    showBrowseTemplates?: (opts?: {
      addNewBlock?: (block: BlockRequestPayloadType) => void,
      addNew?: boolean;
      blockType?: BlockTypeEnum;
      language?: BlockLanguageEnum;
    }) => void;
    v2?: boolean;
  },
) => {
  const {
    blockTemplatesByBlockType,
    dataIntegrationType,
    languages,
    onlyCustomTemplate,
    showBrowseTemplates,
  } = opts || {};

  let dataSourceMenuItemsMapping = {};

  if (!opts?.v2) {
    dataSourceMenuItemsMapping = Object.fromEntries(CONVERTIBLE_BLOCK_TYPES.map(
      (blockType: BlockTypeEnum) => ([
        blockType,
          createDataSourceMenuItems(blockType, addNewBlock, pipelineType),
      ])),
    );
  }

  const customTemplate = {
    label: () => 'Custom template',
    onClick: () => showBrowseTemplates({
      addNewBlock,
      blockType: blockType,
      language: BlockLanguageEnum.SQL,
    }),
    uuid: `${blockType}/custom_template`,
  };

  if (onlyCustomTemplate) {
    return [customTemplate];
  }

  if (pipelineType === PipelineTypeEnum.PYSPARK
    || (pipelineType === PipelineTypeEnum.STREAMING)
  ) {
    return dataSourceMenuItemsMapping[blockType];
  } else if (dataIntegrationType && opts?.v2) {
    const additionalTemplates =
      blockTemplatesByBlockType?.[blockType]?.[dataIntegrationType]?.items || [];

    return [
      {
        // @ts-ignore
        items: sortByKey(additionalTemplates, ({ label }) => label()),
        uuid: `${blockType}/${dataIntegrationType}`,
      }
    ];
  } else {
    const additionalTemplates =
      blockTemplatesByBlockType?.[blockType]?.[BlockLanguageEnum.PYTHON]?.items || [];

    const arr = [
      {
        // @ts-ignore
        items: sortByKey(
          (dataSourceMenuItemsMapping[blockType] || []).concat(additionalTemplates),
          ({ label }) => label(),
        ),
        label: () => 'Python',
        uuid: `${blockType}/${BlockLanguageEnum.PYTHON}`,
      },
    ];

    if (!languages || languages?.includes(BlockLanguageEnum.SQL)) {
      // @ts-ignore
      arr.push(SQLMenuItems(addNewBlock, blockType));
    }
    if (!languages || languages?.includes(BlockLanguageEnum.R)) {
      // @ts-ignore
      arr.push(RMenuItems(addNewBlock, blockType));
    }

    if (
      ![BlockTypeEnum.MARKDOWN, BlockTypeEnum.SCRATCHPAD].includes(blockType)
        && showBrowseTemplates
    ) {
      // @ts-ignore
      arr.push(customTemplate);
    }

    return arr;
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
