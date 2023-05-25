import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BlockColorEnum, BlockTypeEnum } from '@interfaces/BlockType';
import {
  BORDER_RADIUS,
  BORDER_STYLE,
  BORDER_WIDTH,
  BORDER_WIDTH_THICK,
} from '@oracle/styles/units/borders';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ThemeType } from '@oracle/styles/themes/constants';
import { transition } from '@oracle/styles/mixins';

// Look at the code editor div class "margin" and role "presentation"
export const LEFT_PADDING = 68;

export function getColorsForBlockType(
  blockType: BlockTypeEnum,
  props: {
    blockColor?: BlockColorEnum,
    isSelected?: boolean,
    theme?: ThemeType,
  },
): {
  accent?: string;
  accentLight?: string;
} {
  let accent = (props?.theme?.borders || dark.borders).light;
  let accentLight = (props?.theme?.monotone || dark.monotone).grey500;
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
  } else if (BlockTypeEnum.EXTENSION === blockType || blockColor === BlockColorEnum.TEAL) {
    accent = (theme?.accent || dark.accent).teal;
    accentLight = (theme?.accent || dark.accent).tealLight;
  } else if (BlockTypeEnum.CALLBACK === blockType) {
    accent = (theme?.accent || dark.accent).rose;
    accentLight = (theme?.accent || dark.accent).roseLight;
  } else if (BlockTypeEnum.SCRATCHPAD === blockType
    || blockColor === BlockColorEnum.GREY
    || (BlockTypeEnum.CUSTOM === blockType && !blockColor)) {
    accent = (theme || dark).content.default;
    accentLight = (theme || dark).accent.contentDefaultTransparent;
  }

  return {
    accent,
    accentLight,
  };
}

export type BorderColorShareProps = {
  blockType?: BlockTypeEnum;
  dynamicBlock?: boolean;
  dynamicChildBlock?: boolean;
  hasError?: boolean;
  selected: boolean;
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

export const BlockHeaderStyle = styled.div<{
  bottomBorder?: boolean;
  zIndex: number;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  border-top-style: ${BORDER_STYLE};
  border-top-width: ${BORDER_WIDTH_THICK}px;
  border-left-style: ${BORDER_STYLE};
  border-left-width: ${BORDER_WIDTH_THICK}px;
  border-right-style: ${BORDER_STYLE};
  border-right-width: ${BORDER_WIDTH_THICK}px;
  padding: ${UNIT}px;
  position: sticky;
  top: -5px;

  ${props => `
    background-color: ${(props.theme || dark).background.content};
  `}

  ${props => props.bottomBorder && `
    border-bottom: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.medium2};
  `}

  ${props => props.zIndex && `
    z-index: ${6 + (props.zIndex || 0)};
  `}
`;

export const CodeContainerStyle = styled.div<{
  hasOutput: boolean;
  lightBackground?: boolean;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-left-style: ${BORDER_STYLE};
  border-left-width: ${BORDER_WIDTH_THICK}px;
  border-right-style: ${BORDER_STYLE};
  border-right-width: ${BORDER_WIDTH_THICK}px;
  padding-bottom: ${UNIT}px;
  padding-top: ${UNIT}px;
  position: relative;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => props.lightBackground && `
    background-color: ${(props.theme || dark).background.content};
  `}

  ${props => !props.hasOutput && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
    border-bottom-style: ${BORDER_STYLE};
    border-bottom-width: ${BORDER_WIDTH_THICK}px;
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
}>`
  align-items: center;
  display: flex;
  height: ${UNIT * 2}px;
  justify-content: center;
  position: relative;
  z-index: 8;
  bottom: ${UNIT * 0.5}px;

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
`;

export const BlockDividerInner = styled.div`
  height 1px;
  width: 100%;
  position: absolute;
  z-index: -1;
  top: ${UNIT * 1.5}px;
`;

export const CodeHelperStyle = styled.div<{
  normalPadding?: boolean;
}>`
  margin-bottom: ${1 * UNIT}px;
  padding-bottom: ${1 * UNIT}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
    padding-left: ${props.normalPadding ? UNIT : LEFT_PADDING}px;
  `}
`;

export const TimeTrackerStyle =  styled.div`
  bottom: ${UNIT * 1}px;
  left: ${LEFT_PADDING}px;
  position: absolute;
`;
