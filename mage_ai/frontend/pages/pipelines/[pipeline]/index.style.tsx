import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { ALL_HEADERS_HEIGHT } from '@components/TripleLayout/index.style';
import { COLUMN_HEADER_CHART_HEIGHT } from '@components/datasets/overview/utils';
import { REGULAR_LINE_HEIGHT } from '@oracle/styles/fonts/sizes';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const BeforeStyle = styled.div`
  position: relative;
`;

export const BeforeContainerStyle = styled.div<{
  fullWidth: boolean;
  heightOffset: number;
  widthOffset: number;
}>`
  ${ScrollbarStyledCss}

  overflow: auto;
  position: absolute;
  // width: fit-content;

  ${props => `
    height: calc(100vh - ${ALL_HEADERS_HEIGHT}px - ${props.heightOffset}px);
  `}

  ${props => props.fullWidth && `
    width: calc(100% - ${props.widthOffset || 0}px);
  `}

  ${props => props.widthOffset && `
    left: ${props.widthOffset}px;
  `}
`;

export const NavigationStyle = styled.div`
  height: 100%;
  position: fixed;
  left: 0;

  ${props => `
    border-right: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;
