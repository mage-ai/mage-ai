import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

export const VERTICAL_NAVIGATION_WIDTH = (PADDING_UNITS * UNIT) + (5 * UNIT) + (PADDING_UNITS * UNIT);

export const ContainerStyle = styled.div`
  display: flex;
  flex-direction: row;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  position: fixed;
  top: ${HEADER_HEIGHT}px;
  width: 100%;

  ${props => `
    background-color: ${(props.theme.background || dark.background).page};
  `}
`;

export const VerticalNavigationStyle = styled.div`
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border-right: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export const SubheaderStyle = styled.div`
  padding: ${PADDING_UNITS * UNIT}px;
  position: relative;
  z-index: 2;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export const ContentStyle = styled.div<{
  heightOffset?: number;
}>`
  ${ScrollbarStyledCss}

  overflow: auto;

  ${props => `
    height: calc(100vh - ${HEADER_HEIGHT + (props.heightOffset || 0)}px);
  `}
`;
