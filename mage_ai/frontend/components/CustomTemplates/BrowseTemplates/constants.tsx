import CustomTemplateType from '@interfaces/CustomTemplateType';
import StreamingPipeline from '@oracle/icons/custom/StreamingPipeline';
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
  DataIntegrationPipeline,
  File as FileIcon,
  FrameBoxSelection,
  Lightning,
  Sensor,
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
  label?: () => string;
  filterTemplates?: (customTemplates: CustomTemplateType) => CustomTemplateType[];
  selectedBackgroundColor?: (theme: any) => string;
  selectedIconProps?: {
    [key: string]: string;
  };
  uuid: string | BlockTypeEnum;
};

export const NAV_LINKS: NavLinkType[] = [
  {
    Icon: TemplateShapes,
    uuid: 'All templates',
  },
].concat([
  {
    Icon: CubeWithArrowDown,
    uuid: BlockTypeEnum.DATA_LOADER,
  },
  {
    Icon: FrameBoxSelection,
    uuid: BlockTypeEnum.TRANSFORMER,
  },
  {
    Icon: CircleWithArrowUp,
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.DATA_EXPORTER,
  },
  {
    Icon: Sensor,
    uuid: BlockTypeEnum.SENSOR,
  },
  {
    Icon: BlockGeneric,
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.CUSTOM,
  },
  {
    Icon: Charts,
    uuid: BlockTypeEnum.CHART,
  },
  {
    Icon: Callback,
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.CALLBACK,
  },
  {
    Icon: Conditional,
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.CONDITIONAL,
  },
  {
    Icon: Lightning,
    uuid: BlockTypeEnum.EXTENSION,
  },
  {
    Icon: DBT,
    selectedBackgroundColor: null,
    uuid: BlockTypeEnum.DBT,
  },
  {
    Icon: FileIcon,
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.MARKDOWN,
  },
].map(({
  uuid,
  ...rest
}) => ({
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
    Icon: DataIntegrationPipeline,
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
