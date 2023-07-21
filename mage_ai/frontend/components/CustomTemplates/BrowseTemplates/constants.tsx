import {
  BLOCK_TYPE_NAME_MAPPING,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import {
  Conditional,
  BlockGeneric,
  Callback,
  CircleWithArrowUp,
  CubeWithArrowDown,
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
  {
    Icon: CubeWithArrowDown,
    label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_LOADER],
    selectedBackgroundColor: theme => getColorsForBlockType(
      BlockTypeEnum.DATA_LOADER,
      {
        theme,
      },
    ).accent,
    uuid: BlockTypeEnum.DATA_LOADER,
  },
  {
    Icon: FrameBoxSelection,
    label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.TRANSFORMER],
    selectedBackgroundColor: theme => getColorsForBlockType(
      BlockTypeEnum.TRANSFORMER,
      {
        theme,
      },
    ).accent,
    uuid: BlockTypeEnum.TRANSFORMER,
  },
  {
    Icon: CircleWithArrowUp,
    label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_EXPORTER],
    selectedBackgroundColor: theme => getColorsForBlockType(
      BlockTypeEnum.DATA_EXPORTER,
      {
        theme,
      },
    ).accent,
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.DATA_EXPORTER,
  },
  {
    Icon: Sensor,
    label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.SENSOR],
    selectedBackgroundColor: theme => getColorsForBlockType(
      BlockTypeEnum.SENSOR,
      {
        theme,
      },
    ).accent,
    uuid: BlockTypeEnum.SENSOR,
  },
  {
    Icon: BlockGeneric,
    label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.CUSTOM],
    selectedBackgroundColor: theme => getColorsForBlockType(
      BlockTypeEnum.CUSTOM,
      {
        theme,
      },
    ).accent,
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.CUSTOM,
  },
  {
    Icon: Callback,
    label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.CALLBACK],
    selectedBackgroundColor: theme => getColorsForBlockType(
      BlockTypeEnum.CALLBACK,
      {
        theme,
      },
    ).accent,
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.CALLBACK,
  },
  {
    Icon: Conditional,
    label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.CONDITIONAL],
    selectedBackgroundColor: theme => getColorsForBlockType(
      BlockTypeEnum.CONDITIONAL,
      {
        theme,
      },
    ).accent,
    selectedIconProps: {
      inverted: true,
    },
    uuid: BlockTypeEnum.CONDITIONAL,
  },
  {
    Icon: Lightning,
    label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.EXTENSION],
    selectedBackgroundColor: theme => getColorsForBlockType(
      BlockTypeEnum.EXTENSION,
      {
        theme,
      },
    ).accent,
    uuid: BlockTypeEnum.EXTENSION,
  },
];
