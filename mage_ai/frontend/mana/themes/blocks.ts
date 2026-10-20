import ThemeType from './interfaces';
import { BlockColorEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { COLOR_NAMES } from './colors';

export function getBlockColor(
  blockType: BlockTypeEnum,
  props?: {
    blockColor?: BlockColorEnum;
    getColorName?: boolean;
    isSelected?: boolean;
    theme?: ThemeType;
  },
): {
  accent?: string;
  accentDark?: string;
  accentLight?: string;
  names?: {
    base: string;
    hi: string;
    lo: string;
    md: string;
  };
} {
  const { blockColor, getColorName, isSelected, theme } = props || {};
  const colors = getColorName ? COLOR_NAMES : theme?.colors;

  let accent = colors?.typography?.text?.base;
  let accentDark = '';
  let accentLight = colors?.typography?.text?.muted;
  let baseName = '';

  if (isSelected) {
  } else if (BlockTypeEnum.TRANSFORMER === blockType || blockColor === BlockColorEnum.PURPLE) {
    baseName = 'purple';
    accent = colors?.purple;
    accentLight = colors?.purpleHi;
  } else if (BlockTypeEnum.DATA_EXPORTER === blockType || blockColor === BlockColorEnum.YELLOW) {
    baseName = 'yellow';
    accent = colors?.yellow;
    accentLight = colors?.yellowHi;
  } else if (BlockTypeEnum.DATA_LOADER === blockType || blockColor === BlockColorEnum.BLUE) {
    baseName = 'blue';
    accent = colors?.blueText;
    accentLight = colors?.blueHi;
  } else if (BlockTypeEnum.MARKDOWN === blockType) {
    baseName = 'sky';
    accent = colors?.sky;
    accentLight = colors?.skyHi;
  } else if (BlockTypeEnum.SENSOR === blockType || blockColor === BlockColorEnum.PINK) {
    baseName = 'pink';
    accent = colors?.pink;
    accentLight = colors?.pinkHi;
  } else if (BlockTypeEnum.DBT === blockType) {
    baseName = 'orange';
    accent = colors?.dbt;
    accentLight = colors?.dbtHi;
    accentDark = colors?.dbtLo;
  } else if (BlockTypeEnum.EXTENSION === blockType || blockColor === BlockColorEnum.TEAL) {
    baseName = 'teal';
    accent = colors?.teal;
    accentLight = colors?.tealHi;
  } else if (BlockTypeEnum.CALLBACK === blockType) {
    baseName = 'rose';
    accent = colors?.rose;
    accentLight = colors?.roseHi;
  } else if (BlockTypeEnum.CONDITIONAL === blockType) {
    baseName = 'red';
    accent = colors?.typography?.text?.base;
    accentLight = colors?.typography?.text?.muted;
  } else if (
    BlockTypeEnum.SCRATCHPAD === blockType ||
    blockColor === BlockColorEnum.GREY ||
    (BlockTypeEnum.CUSTOM === blockType && !blockColor)
  ) {
    baseName = 'teal';
    accent = colors?.teal;
    accentLight = colors?.tealHi;
  } else if (
    [BlockTypeEnum.CHART, BlockTypeEnum.GLOBAL_DATA_PRODUCT].includes(blockType) &&
    !blockColor
  ) {
    baseName = 'green';
    accent = colors?.typography?.text?.base;
    accentLight = colors?.typography?.text?.muted;
  } else if (BlockTypeEnum.GROUP === blockType) {
    baseName = 'gray';
  } else if (BlockTypeEnum.PIPELINE === blockType) {
    baseName = 'pink';
  }

  return {
    accent,
    accentDark,
    accentLight,
    names: {
      base: baseName,
      hi: `${baseName}hi`,
      lo: `${baseName}lo`,
      md: `${baseName}md`,
    },
  };
}
