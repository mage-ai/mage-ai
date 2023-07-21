import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

export const ICON_SIZE = UNIT * 2.5;
const NAV_MIN_WIDTH = 40 * UNIT;

export const ContainerStyle = styled.div`
  // background-color: red;
  height: 100%;
  position: relative;
`;

export const NavigationStyle = styled.div`
  height: 100%;
  min-width: ${NAV_MIN_WIDTH}px;
  position: fixed;
  z-index: 1;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border-right: 1px solid ${(props.theme.borders || dark.borders).light};
  `}
`;

export const TabsStyle = styled.div`
  padding-bottom: ${1 * UNIT}px;
  padding-left: ${PADDING_UNITS * UNIT}px;
  padding-right: ${PADDING_UNITS * UNIT}px;
  padding-top: ${1 * UNIT}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).light};
  `}
`;

export const LinksContainerStyle = styled.div`
  ${ScrollbarStyledCss}

  height: 100%;
  min-width: ${NAV_MIN_WIDTH}px;
  overflow: auto;
  position: fixed;
`;

export const NavLinkStyle = styled.div<{
  selected?: boolean;
}>`
  ${transition()}

  padding-bottom: ${1 * UNIT}px;
  padding-left: ${PADDING_UNITS * UNIT}px;
  padding-right: ${PADDING_UNITS * UNIT}px;
  padding-top: ${1 * UNIT}px;

  &:hover {
    cursor: pointer;
  }

  ${props => props.selected && `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;

export const IconStyle = styled.div<{
  backgroundColor?: string;
}>`
  ${transition()}

  border-radius: ${BORDER_RADIUS}px;
  height: ${UNIT * 5}px;
  margin-right: ${UNIT * 1.25}px;
  padding: ${UNIT * 1.25}px;
  width: ${UNIT * 5}px;

  ${props => !props.backgroundColor && `
    background-color: ${(props.theme.background || dark.background).chartBlock};
  `}

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}
`;
