import CustomTemplateType from '@interfaces/CustomTemplateType';
import {
  BLOCK_TYPE_NAME_MAPPING,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import {
  BatchPipeline,
  BlockGeneric,
  Callback,
  Charts,
  CircleWithArrowUp,
  Conditional,
  CubeWithArrowDown,
  DBT,
  File as FileIcon,
  FrameBoxSelection,
  IntegrationPipeline,
  Lightning,
  Sensor,
  StreamingPipeline,
  TemplateShapes,
} from '@oracle/icons';
import {
  PIPELINE_TYPE_LABEL_MAPPING,
  PipelineTypeEnum,
} from '@interfaces/PipelineType';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

export const NAV_TAB_BLOCKS = {
  uuid: 'Blocks',
};

export const NAV_TAB_PIPELINES = {
  uuid: 'Pipelines',
};

export const NAV_TABS = [
  NAV_TAB_BLOCKS,
  NAV_TAB_PIPELINES,
];

export type NavLinkType = {
  Icon?: any;
  description?: () => string | any;
  label?: (opts?: {
    [key: string]: any;
  }) => string | any;
  filterTemplates?: (customTemplates: CustomTemplateType) => CustomTemplateType[];
  selectedBackgroundColor?: (theme: any) => string;
  selectedIconProps?: {
    [key: string]: string;
  };
  uuid: string | BlockTypeEnum;
};

export const BLOCK_TYPE_ICON_MAPPING = {
  [BlockTypeEnum.CALLBACK]: Callback,
  [BlockTypeEnum.CHART]: Charts,
  [BlockTypeEnum.CONDITIONAL]: Conditional,
  [BlockTypeEnum.CUSTOM]: BlockGeneric,
  [BlockTypeEnum.DATA_EXPORTER]: CircleWithArrowUp,
  [BlockTypeEnum.DATA_LOADER]: CubeWithArrowDown,
  [BlockTypeEnum.DBT]: DBT,
  [BlockTypeEnum.EXTENSION]: Lightning,
  [BlockTypeEnum.MARKDOWN]: FileIcon,
  [BlockTypeEnum.SENSOR]: Sensor,
  [BlockTypeEnum.TRANSFORMER]: FrameBoxSelection,
};

export const NAV_LINKS: NavLinkType[] = [
  {
    Icon: TemplateShapes,
    uuid: 'All templates',
  },
].concat([
  {
    uuid: BlockTypeEnum.DATA_LOADER,
  },
  {
    uuid: BlockTypeEnum.TRANSFORMER,
  },
  {
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.DATA_EXPORTER,
  },
  {
    uuid: BlockTypeEnum.SENSOR,
  },
  {
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.CUSTOM,
  },
  {
    uuid: BlockTypeEnum.CHART,
  },
  {
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.CALLBACK,
  },
  {
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.CONDITIONAL,
  },
  {
    uuid: BlockTypeEnum.EXTENSION,
  },
  {
    selectedBackgroundColor: null,
    uuid: BlockTypeEnum.DBT,
  },
  {
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.MARKDOWN,
  },
].map(({
  uuid,
  ...rest
}) => ({
  Icon: BLOCK_TYPE_ICON_MAPPING[uuid],
  filterTemplates: (customTemplates: CustomTemplateType[]) => customTemplates?.filter(({
    block_type: blockType,
  }) => blockType === uuid),
  label: () => BLOCK_TYPE_NAME_MAPPING[uuid],
  selectedBackgroundColor: theme => getColorsForBlockType(uuid, {
      theme,
  }).accent,
  uuid,
  ...rest,
})));

export const NAV_LINKS_PIPELINES: NavLinkType[] = [
  {
    Icon: TemplateShapes,
    uuid: 'All templates',
  },
].concat([
  {
    Icon: BatchPipeline,
    uuid: PipelineTypeEnum.PYTHON,
  },
  {
    Icon: IntegrationPipeline,
    uuid: PipelineTypeEnum.INTEGRATION,
  },
  {
    Icon: StreamingPipeline,
    uuid: PipelineTypeEnum.STREAMING,
  },
].map(({
  uuid,
  ...rest
}) => ({
  filterTemplates: (customTemplates: CustomTemplateType[]) => customTemplates?.filter(
    ct => ct?.pipeline?.type === uuid,
  ),
  label: () => PIPELINE_TYPE_LABEL_MAPPING[uuid],
  uuid,
  ...rest,
})));
