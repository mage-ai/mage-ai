import ThemeType from './interfaces';
import { BlockColorEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { ColorsType } from './colors';

export function getBlockColor(
  blockType: BlockTypeEnum,
  props?: {
    blockColor?: BlockColorEnum;
    isSelected?: boolean;
    theme?: ThemeType;
  },
): {
  accent?: string;
  accentDark?: string;
  accentLight?: string;
} {
  const { blockColor, isSelected, theme } = props || {};
  const colors = theme?.colors || ({} as ColorsType);

  let accent = colors?.typography?.text?.base;
  let accentLight = colors?.typography?.text?.muted;
  let accentDark;

  if (isSelected) {
  } else if (BlockTypeEnum.TRANSFORMER === blockType || blockColor === BlockColorEnum.PURPLE) {
    accent = colors?.purple;
    accentLight = colors?.purpleHi;
  } else if (BlockTypeEnum.DATA_EXPORTER === blockType || blockColor === BlockColorEnum.YELLOW) {
    accent = colors?.yellow;
    accentLight = colors?.yellowHi;
  } else if (BlockTypeEnum.DATA_LOADER === blockType || blockColor === BlockColorEnum.BLUE) {
    accent = colors?.blueText;
    accentLight = colors?.blueHi;
  } else if (BlockTypeEnum.MARKDOWN === blockType) {
    accent = colors?.sky;
    accentLight = colors?.skyHi;
  } else if (BlockTypeEnum.SENSOR === blockType || blockColor === BlockColorEnum.PINK) {
    accent = colors?.pink;
    accentLight = colors?.pinkHi;
  } else if (BlockTypeEnum.DBT === blockType) {
    accent = colors?.dbt;
    accentLight = colors?.dbtHi;
    accentDark = colors?.dbtLo;
  } else if (BlockTypeEnum.EXTENSION === blockType || blockColor === BlockColorEnum.TEAL) {
    accent = colors?.teal;
    accentLight = colors?.tealHi;
  } else if (BlockTypeEnum.CALLBACK === blockType) {
    accent = colors?.rose;
    accentLight = colors?.roseHi;
  } else if (BlockTypeEnum.CONDITIONAL === blockType) {
    accent = colors?.typography?.text?.base;
    accentLight = colors?.typography?.text?.muted;
  } else if (
    BlockTypeEnum.SCRATCHPAD === blockType ||
    blockColor === BlockColorEnum.GREY ||
    (BlockTypeEnum.CUSTOM === blockType && !blockColor)
  ) {
    accent = colors?.typography?.text?.muted;
    accentLight = colors?.typography?.text?.muted;
  } else if (
    [BlockTypeEnum.CHART, BlockTypeEnum.GLOBAL_DATA_PRODUCT].includes(blockType) &&
    !blockColor
  ) {
    accent = colors?.typography?.text?.base;
    accentLight = colors?.typography?.text?.muted;
  }

  return {
    accent,
    accentLight,
    accentDark,
  };
}
