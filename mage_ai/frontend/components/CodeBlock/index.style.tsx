import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BlockColorEnum, BlockTypeEnum } from '@interfaces/BlockType';
import {
  BORDER_RADIUS,
  BORDER_STYLE,
  BORDER_WIDTH,
  BORDER_WIDTH_THICK,
} from '@oracle/styles/units/borders';
import {
  BUTTON_GRADIENT,
  CHART,
  EARTH_GRADIENT,
  EARTH_LIGHTING,
  FIRE_GRADIENT,
  // FIRE_PRIMARY,
  ICE_WATER,
  PSYCHIC_EARTH,
  PURPLE_BLUE,
  SPARK_EARTH,
  WATER_GRADIENT,
  // WIND_GRADIENT,
} from '@oracle/styles/colors/gradients';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { hideScrollBar } from '@oracle/styles/scrollbars';
import { transition } from '@oracle/styles/mixins';

// Look at the code editor div class "margin" and role "presentation"
export const LEFT_PADDING = 68;

export const SIDE_BY_SIDE_HORIZONTAL_PADDING = 1.5 * UNIT;
export const SIDE_BY_SIDE_VERTICAL_PADDING = 3 * UNIT;

export function getGradientColorForBlockType(blockType: BlockTypeEnum) {
  let value = BUTTON_GRADIENT;

  if (BlockTypeEnum.CALLBACK === blockType) {
    value = SPARK_EARTH;
  } else if (BlockTypeEnum.CHART === blockType) {
    value = CHART;
  } else if (BlockTypeEnum.CONDITIONAL === blockType) {
    value = CHART;
  } else if (BlockTypeEnum.CUSTOM === blockType) {
    value = PSYCHIC_EARTH;
  } else if (BlockTypeEnum.DATA_EXPORTER === blockType) {
    value = EARTH_LIGHTING;
  } else if (BlockTypeEnum.DATA_LOADER === blockType) {
    value = ICE_WATER;
  } else if (BlockTypeEnum.DBT === blockType) {
    value = SPARK_EARTH;
  } else if (BlockTypeEnum.EXTENSION === blockType) {
    value = EARTH_GRADIENT;
  } else if (BlockTypeEnum.GLOBAL_DATA_PRODUCT === blockType) {
    value = PURPLE_BLUE;
  } else if (BlockTypeEnum.SCRATCHPAD === blockType) {
    value = CHART;
  } else if (BlockTypeEnum.SENSOR === blockType) {
    value = FIRE_GRADIENT;
  } else if (BlockTypeEnum.MARKDOWN === blockType) {
    value = WATER_GRADIENT;
  } else if (BlockTypeEnum.TRANSFORMER === blockType) {
    value = BUTTON_GRADIENT;
  }

  return value;
}

export function getColorsForBlockType(
  blockType: BlockTypeEnum,
  props?: {
    blockColor?: BlockColorEnum,
    isSelected?: boolean,
    theme?: ThemeType,
  },
): {
  accent?: string;
  accentDark?: string;
  accentLight?: string;
} {
  let accent = (props?.theme || dark)?.content?.muted;
  let accentLight = (props?.theme?.monotone || dark.monotone).grey500;
  let accentDark;
  const { blockColor, isSelected, theme } = props || {};

  if (isSelected) {
    accent = (theme || dark).content.active;
  } else if (BlockTypeEnum.TRANSFORMER === blockType
    || blockColor === BlockColorEnum.PURPLE) {
    accent = (theme || dark).accent.purple;
    accentLight = (theme || dark).accent.purpleLight;
  } else if (BlockTypeEnum.DATA_EXPORTER === blockType
    || blockColor === BlockColorEnum.YELLOW) {
    accent = (theme || dark).accent.yellow;
    accentLight = (theme || dark).accent.yellowLight;
  } else if (BlockTypeEnum.DATA_LOADER === blockType
    || blockColor === BlockColorEnum.BLUE) {
    accent = (theme || dark).accent.blue;
    accentLight = (theme || dark).accent.blueLight;
  } else if (BlockTypeEnum.MARKDOWN === blockType) {
    accent = (theme || dark).accent.sky;
    accentLight = (theme || dark).accent.skyLight;
  } else if (BlockTypeEnum.SENSOR === blockType
    || blockColor === BlockColorEnum.PINK) {
    accent = (theme || dark).accent.pink;
    accentLight = (theme || dark).accent.pinkLight;
  } else if (BlockTypeEnum.DBT === blockType) {
    accent = (theme || dark).accent.dbt;
    accentLight = (theme || dark).accent.dbtLight;
    accentDark = (theme || dark).accent.dbtDark;
  } else if (BlockTypeEnum.EXTENSION === blockType || blockColor === BlockColorEnum.TEAL) {
    accent = (theme?.accent || dark.accent).teal;
    accentLight = (theme?.accent || dark.accent).tealLight;
  } else if (BlockTypeEnum.CALLBACK === blockType) {
    accent = (theme?.accent || dark.accent).rose;
    accentLight = (theme?.accent || dark.accent).roseLight;
  } else if (BlockTypeEnum.CONDITIONAL === blockType) {
    accent = (theme || dark).content.default;
    accentLight = (theme || dark).accent.contentDefaultTransparent;
  } else if (BlockTypeEnum.SCRATCHPAD === blockType
    || blockColor === BlockColorEnum.GREY
    || (BlockTypeEnum.CUSTOM === blockType && !blockColor)) {
    accent = (theme || dark).content.default;
    accentLight = (theme || dark).accent.contentDefaultTransparent;
  } else if ([
    BlockTypeEnum.CHART,
    BlockTypeEnum.GLOBAL_DATA_PRODUCT,
  ].includes(blockType) && !blockColor) {
    accent = (theme || dark).monotone.white;
    accentLight = (theme || dark).monotone.whiteTransparent;
  }

  return {
    accent,
    accentLight,
    accentDark,
  };
}

export type BorderColorShareProps = {
  blockType?: BlockTypeEnum;
  dynamicBlock?: boolean;
  dynamicChildBlock?: boolean;
  hasError?: boolean;
  selected?: boolean;
};

export const BORDER_COLOR_SHARED_STYLES = css<BorderColorShareProps>`
  ${transition()}

  ${props => !props.selected && !props.hasError && `
    border-color: ${getColorsForBlockType(props.blockType, props).accentLight};
  `}

  ${props => props.selected && !props.hasError && `
    border-color: ${getColorsForBlockType(props.blockType, props).accent};
  `}

  ${props => !props.selected && props.hasError && `
    border-color: ${(props.theme.accent || dark.accent).negativeTransparent};
  `}

  ${props => props.selected && props.hasError && `
    border-color: ${(props.theme.borders || dark.borders).danger};
  `}

  ${props => props.dynamicBlock && `
    border-style: dashed !important;
  `}

  ${props => props.dynamicChildBlock && `
    border-style: dotted !important;
  `}
`;

export const CodeBlockV1WrapperStyle = styled.div`
  &.disable-border-radius {
    .code-block-header-sticky {
      border-top-left-radius: 0px !important;
      border-top-right-radius: 0px !important;
    }
 }

  .code-block-header-sticky {
    border-top-left-radius: ${BORDER_RADIUS}px;
    border-top-right-radius: ${BORDER_RADIUS}px;
  }
`;

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  position: relative;
`;

export const HiddenBlockContainerStyle = styled.div<BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-radius: ${BORDER_RADIUS}px;
  border-style: ${BORDER_STYLE};
  border-width: ${BORDER_WIDTH_THICK}px;

  ${props => `
    background-color: ${(props.theme || dark).background.content};

    &:hover {
      border-color: ${getColorsForBlockType(props.blockType, props).accent};
    }
  `}
`;

export const HeaderHorizontalBorder = styled.div`
  ${props => `
    border-bottom: 1px solid ${(props.theme || dark).borders.darkLight};
  `}
`;

export const BlockHeaderStyle = styled.div<{
  noSticky?: boolean;
  zIndex: number;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-top-style: ${BORDER_STYLE};
  border-top-width: ${BORDER_WIDTH_THICK}px;
  border-left-style: ${BORDER_STYLE};
  border-left-width: ${BORDER_WIDTH_THICK}px;
  border-right-style: ${BORDER_STYLE};
  border-right-width: ${BORDER_WIDTH_THICK}px;

  ${props => `
    background-color: ${(props.theme || dark).background.dashboard};
  `}

  ${props => typeof props.zIndex !== 'undefined' && props.zIndex !== null && `
    z-index: ${6 + (props.zIndex || 0)};
  `}

  ${props => !props.noSticky && `
    // This is to hide the horizontal scrollbar in the block header when sideBySide is enabled,
    // and the screen width is too small.
    position: sticky;
    top: 0px;
  `}

  ${props => props.noSticky && `
    ${hideScrollBar()}

    overflow-x: auto;
    overflow-y: visible;
  `}
`;

export const SubheaderStyle = styled.div<{
  darkBorder?: boolean;
  noBackground?: boolean;
}>`
  ${props => !props.darkBorder && `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).darkLight};
  `}

  ${props => props.darkBorder && `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => !props.noBackground && `
    background-color: ${(props.theme || dark).background.dashboard};
  `}
`;

export const CodeContainerStyle = styled.div<{
  hideBorderBottom: boolean;
  lightBackground?: boolean;
  noPadding?: boolean;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-left-style: ${BORDER_STYLE};
  border-left-width: ${BORDER_WIDTH_THICK}px;
  border-right-style: ${BORDER_STYLE};
  border-right-width: ${BORDER_WIDTH_THICK}px;
  position: relative;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => !props.noPadding && `
    padding-bottom: ${UNIT}px;
    padding-top: ${UNIT}px;
  `}

  ${props => props.lightBackground && `
    background-color: ${(props.theme || dark).background.content};
  `}

  ${props => !props.hideBorderBottom && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
    border-bottom-style: ${BORDER_STYLE};
    border-bottom-width: ${BORDER_WIDTH_THICK}px;
    overflow: hidden;
  `}

  .line-numbers {
    opacity: 0;
  }

  &.selected {
    .line-numbers {
      opacity: 1 !important;
    }
  }
`;

export const BlockDivider = styled.div<{
  additionalZIndex?: number;
  bottom?: number;
  height?: number;
}>`
  align-items: center;
  display: flex;
  height: ${UNIT * 2}px;
  justify-content: center;
  position: relative;
  z-index: 8;

  &:hover {
    ${props => props.additionalZIndex > 0 && `
      z-index: ${8 + props.additionalZIndex};
    `}

    .block-divider-inner {
      ${props => `
        background-color: ${(props.theme.text || dark.text).fileBrowser};
      `}
    }
  }

  ${props => !props.height && `
    height: ${UNIT * 2}px;
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${props => !props.bottom && `
    bottom: ${UNIT * 0.5}px;
  `}

  ${props => typeof props.bottom !== 'undefined' && `
    bottom: ${props.bottom}px;
  `}
`;

export const BlockDividerInner = styled.div<{
  top?: number;
}>`
  height 1px;
  width: 100%;
  position: absolute;
  z-index: -1;

  ${props => !props.top && `
    top: ${UNIT * 1.5}px;
  `}

  ${props => typeof props.top !== 'undefined' && `
    top: ${props.top}px;
  `}
`;

export const CodeHelperStyle = styled.div<{
  noMargin?: boolean;
  normalPadding?: boolean;
}>`
  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
    padding-left: ${props.normalPadding ? UNIT : LEFT_PADDING}px;
  `}

  ${props => !props.noMargin && `
    margin-bottom: ${1 * UNIT}px;
    padding-bottom: ${1 * UNIT}px;
  `}
`;

export const TimeTrackerStyle =  styled.div`
  bottom: ${UNIT * 1}px;
  left: ${LEFT_PADDING}px;
  position: absolute;
`;

export const ScrollColunnsContainerStyle = styled.div<{
  zIndex?: number;
}>`
  position: relative;

  ${props => `
    z-index: ${props?.zIndex || 1};
  `}
`;

export const ScrollColunnStyle = styled.div.attrs(({
  height,
  left,
  right,
  top,
  width,
  zIndex,
}: {
  height: number;
  left?: number;
  right?: number;
  top?: number;
  width: number;
  zIndex?: number;
}) => ({
  style: {
    position: 'fixed',
    height,
    width,
    left,
    right,
    top,
    zIndex: (zIndex || 0) + 2,
  },
}))`
`;
