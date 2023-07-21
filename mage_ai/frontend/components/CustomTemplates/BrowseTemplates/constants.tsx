import CustomTemplateType from '@interfaces/CustomTemplateType';
import {
  BLOCK_TYPE_NAME_MAPPING,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import {
  Conditional,
  BlockGeneric,
  Callback,
  Charts,
  CircleWithArrowUp,
  CubeWithArrowDown,
  DBT,
  FrameBoxSelection,
  Lightning,
  Sensor,
  TemplateShapes,
} from '@oracle/icons';
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
  uuid: string;
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
].map(({
  uuid,
  ...rest
}) => ({
  filterTemplates: (customTemplates: CustomTemplateType) => customTemplates?.filter(({
    block_type: blockType,
  }) => blockType === uuid),
  label: () => BLOCK_TYPE_NAME_MAPPING[uuid],
  selectedBackgroundColor: theme => getColorsForBlockType(uuid, {
      theme,
  }).accent,
  uuid,
  ...rest,
})));
