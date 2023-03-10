import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { transition } from '@oracle/styles/mixins';

export const VERTICAL_NAVIGATION_WIDTH = (PADDING_UNITS * UNIT) + (5 * UNIT) + (PADDING_UNITS * UNIT) + 1;

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

export const VerticalNavigationStyle = styled.div<{
  borderLeft?: boolean;
}>`
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}

  ${props => props.borderLeft && `
    border-left: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => !props.borderLeft && `
    border-left: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export const SubheaderStyle = styled.div`
  width: fit-content;
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

export const NavigationItemStyle = styled.div<{
  primary?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${UNIT}px;
  border-radius: ${BORDER_RADIUS}px;

  ${props => props.primary && `
    ${transition()}
    background: ${(props.theme || dark).chart.backgroundPrimary};
    border: 1px solid ${(props.theme || dark).feature.active};

    &:hover {
      background-color: ${(props.theme || dark).interactive.linkSecondary};
    }
  `}
`;
