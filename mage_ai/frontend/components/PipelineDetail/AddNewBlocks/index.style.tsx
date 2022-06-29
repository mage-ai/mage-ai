import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = PADDING_UNITS * UNIT;

type IconContainerProps = {
  blue?: boolean;
  border?: boolean;
  purple?: boolean;
};

export const IconContainerStyle = styled.div<IconContainerProps>`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  border: 1px solid transparent;
  height: ${ICON_SIZE + (UNIT / 2)}px;
  padding: ${(UNIT / 4) - 1}px;
  width: ${ICON_SIZE + (UNIT / 2)}px;

  ${props => props.border && `
    border: 1px dotted ${(props.theme.content || dark.content).active};
  `}

  ${props => props.blue && `
    background-color: ${(props.theme.accent || dark.accent).blue};
  `}

  ${props => props.purple && `
    background-color: ${(props.theme.accent || dark.accent).purple};
  `}
`;
