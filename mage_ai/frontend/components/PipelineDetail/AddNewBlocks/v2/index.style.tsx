import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = PADDING_UNITS * UNIT;

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${2.5 * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).dashboard};
    border: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
    box-shadow: ${(props.theme.shadow || dark.shadow).frame};
  `}
`;

export const DividerStyle = styled.div`
  height: ${ICON_SIZE}px;
  width: 1px;

  ${props => `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}
`;

export const ButtonWrapper = styled.div<{
  increasedZIndex?: boolean;
}>`
  position: relative;

  ${props => props.increasedZIndex && `
    z-index: 3;
  `}
`;
