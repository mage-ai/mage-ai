import styled from 'styled-components';

import { ALL_HEADERS_HEIGHT } from '@components/TripleLayout/index.style';
import { COLUMN_HEADER_CHART_HEIGHT } from '@components/datasets/overview/utils';
import { REGULAR_LINE_HEIGHT } from '@oracle/styles/fonts/sizes';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';
import dark from '@oracle/styles/themes/dark';

export const TOTAL_PADDING = UNIT * 4;
export const TABLE_COLUMN_HEADER_HEIGHT = COLUMN_HEADER_CHART_HEIGHT + (UNIT * 3) + REGULAR_LINE_HEIGHT;

export const SidekickContainerStyle = styled.div<{
  fullWidth: boolean;
  heightOffset: number;
  overflowHidden?: boolean;
}>`
  ${ScrollbarStyledCss}

  overflow: auto;
  position: absolute;
  width: 100%;

  ${props => `
    height: calc(100vh - ${ALL_HEADERS_HEIGHT}px - ${props.heightOffset}px);
  `}

  ${props => props.overflowHidden && `
    overflow: hidden;
  `}
`;

export const PaddingContainerStyle = styled.div<{ noPadding?: boolean }>`
  padding: ${UNIT * 2}px;

  ${props => props.noPadding && `
    padding: 0;
  `}
`;

export const StreamingTreeGraphStyle = styled.div<{
  height: number;
}>`
  overflow: hidden;

  ${props => `
    height: ${props.height}px;
  `}
`;

export const StreamingTreeResizeHandleStyle = styled.div`
  cursor: row-resize;
  height: ${UNIT}px;
  position: relative;
  width: 100%;

  ${props => `
    background-color: ${(props.theme || dark).background.panel};
  `}

  &::before {
    content: '';
    left: ${UNIT}px;
    position: absolute;
    right: ${UNIT}px;
    top: 50%;

    ${props => `
      border-top: 1px solid ${(props.theme || dark).borders.medium};
    `}
  }

  &::after {
    border-radius: ${UNIT}px;
    content: '';
    height: ${UNIT / 2}px;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: ${UNIT * 6}px;

    ${props => `
      background-color: ${(props.theme || dark).borders.dark};
    `}
  }
`;
