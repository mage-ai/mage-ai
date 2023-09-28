import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import {
  BORDER_WIDTH,
  BORDER_STYLE,
  BORDER_RADIUS,
} from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const PADDING_SIZE = UNIT * 1.5;
export const ROW_VERTICAL_PADDING_SIZE = UNIT * 1.5;
export const CONDENSED_VERTICAL_ROW_PADDING = 9;
export const SCROLL_PADDING_SIZE = 3;
export const ROW_PADDING_HORIZONTAL_UNITS = 2;

type RowContainerStyleProps = {
  maxHeight?: number;
  minHeight?: number;
  scrollable?: boolean;
};

type RowStyleProps = {
  condensed?: boolean;
  last?: boolean;
  noBorder?: boolean;
  noHorizontalPadding?: boolean;
  sameColorBorders?: boolean;
  secondary?: boolean;
};

export const TableStyle = styled.div<{
  noBackground?: boolean;
  noBoxShadow?: boolean;
  width?: number;
}>`
  border-radius: ${BORDER_RADIUS}px;
  overflow: hidden;
  width: 100%;

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => `
    background-color: ${(props.theme || dark).background.page};
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).interactive.defaultBorder};
    box-shadow: ${(props.theme || dark).shadow.frame};
  `}

  ${props => props.noBackground && `
    background-color: transparent;
  `}

  ${props => props.noBoxShadow && `
    box-shadow: none;
  `}
`;

export const RowContainerStyle = styled.div<RowContainerStyleProps>`
  overflow: auto;
  border-bottom-left-radius: ${BORDER_RADIUS}px;
  border-bottom-right-radius: ${BORDER_RADIUS}px;

  ${ScrollbarStyledCss}

  ${props => props.maxHeight > 0 && `
    max-height: ${props.maxHeight}px;
  `}

  ${props => props.minHeight > 0 && `
    min-height: ${props.minHeight}px;
  `}

  ${props => props.scrollable && `
    margin-bottom: ${UNIT}px;
    overflow-y: auto;
    padding-top: ${SCROLL_PADDING_SIZE}px;
    padding-left: ${SCROLL_PADDING_SIZE}px;
    padding-right: ${SCROLL_PADDING_SIZE}px;
  `}
`;

export const HeaderStyle = styled.div`
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  padding: ${PADDING_SIZE}px ${ROW_PADDING_HORIZONTAL_UNITS * UNIT}px;

  ${props => `
    border-bottom: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}
`;

export const RowStyle = styled.div<RowStyleProps>`
  padding: ${ROW_VERTICAL_PADDING_SIZE}px ${ROW_PADDING_HORIZONTAL_UNITS * UNIT}px;

  ${props => `
    border-bottom: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.medium2};
  `}

  ${props => props.sameColorBorders && `
    border-bottom-color: ${(props.theme || dark).interactive.defaultBorder};
  `}

  ${props => props.noHorizontalPadding && `
    padding-left: 0;
    padding-right: 0;
  `}

  ${props => props.condensed && `
    padding-top: ${CONDENSED_VERTICAL_ROW_PADDING}px;
    padding-bottom: ${CONDENSED_VERTICAL_ROW_PADDING}px;
  `}

  ${props => props.secondary && `
    background-color: ${(props.theme.background || dark.background).row2};
  `}

  ${props => props.last && props.noBorder && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
    border-bottom: none;
  `}
`;

export const FooterStyle = styled.div`
  border-bottom-left-radius: ${BORDER_RADIUS}px;
  border-bottom-right-radius: ${BORDER_RADIUS}px;
  padding: ${PADDING_SIZE}px ${ROW_PADDING_HORIZONTAL_UNITS * UNIT}px;

  ${props => `
    border-top: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.medium2};
  `}
`;
