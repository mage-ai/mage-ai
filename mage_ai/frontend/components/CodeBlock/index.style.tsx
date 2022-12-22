import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import {
  BORDER_RADIUS,
  BORDER_STYLE,
  BORDER_WIDTH_THICK,
} from '@oracle/styles/units/borders';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ThemeType } from '@oracle/styles/themes/constants';
import { transition } from '@oracle/styles/mixins';

// Look at the code editor div class "margin" and role "presentation"
export const LEFT_PADDING = 68;

export function getColorsForBlockType(
  blockType: BlockTypeEnum,
  props: { isSelected?: boolean, theme: ThemeType },
): {
  accent?: string;
  accentLight?: string;
} {
  let accent = (props.theme.borders || dark.borders).light;
  let accentLight = (props.theme.monotone || dark.monotone).grey500;
  const { isSelected, theme } = props || {};

  if (isSelected) {
    accent = (theme.content || dark.content).active;
  } else if (BlockTypeEnum.TRANSFORMER === blockType) {
    accent = (theme.accent || dark.accent).purple;
    accentLight = (theme.accent || dark.accent).purpleLight;
  } else if (BlockTypeEnum.DATA_EXPORTER === blockType) {
    accent = (theme.accent || dark.accent).yellow;
    accentLight = (theme.accent || dark.accent).yellowLight;
  } else if (BlockTypeEnum.DATA_LOADER === blockType) {
    accent = (theme.accent || dark.accent).blue;
    accentLight = (theme.accent || dark.accent).blueLight;
  } else if (BlockTypeEnum.SCRATCHPAD === blockType) {
    accent = (theme.content || dark.content).default;
    accentLight = (theme.accent || dark.accent).contentDefaultTransparent;
  } else if (BlockTypeEnum.SENSOR === blockType) {
    accent = (theme.accent || dark.accent).pink;
    accentLight = (theme.accent || dark.accent).pinkLight;
  } else if (BlockTypeEnum.DBT === blockType) {
    accent = (theme.accent || dark.accent).dbt;
    accentLight = (theme.accent || dark.accent).dbtLight;
  }

  return {
    accent,
    accentLight,
  };
}

export type BorderColorShareProps = {
  blockType?: BlockTypeEnum;
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
`;

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  position: relative;
`;

export const BlockHeaderStyle = styled.div<BorderColorShareProps>`
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
  z-index: 5;

  ${props => `
    background-color: ${(props.theme || dark).background.content};
  `}

  ${props => props.selected && `
    z-index: 11;
  `}
`;

export const CodeContainerStyle = styled.div<{
  hasOutput: boolean;
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

export const BlockDivider = styled.div`
  align-items: center;
  display: flex;
  height: ${UNIT * 2}px;
  justify-content: center;
  position: relative;
  z-index: 10;
  bottom: ${UNIT * 0.75}px;

  &:hover {
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

export const CodeHelperStyle = styled.div`
  margin-bottom: ${PADDING_UNITS * UNIT}px;
  padding-bottom: ${UNIT}px;
  padding-left: ${LEFT_PADDING}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export const TimeTrackerStyle =  styled.div`
  bottom: ${UNIT * 1}px;
  left: ${LEFT_PADDING}px;
  position: absolute;
`;
