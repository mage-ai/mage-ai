import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';

export const PopupContainerStyle = styled.div<any>`
  position: absolute;
  max-height: ${UNIT * 58}px;
  z-index: 10;

  border-radius: ${BORDER_RADIUS_LARGE}px;
  padding: ${2 * UNIT}px;

  ${props => `
    box-shadow: ${(props.theme.shadow || dark.shadow).popup};
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
  `}

  ${props => props.leftOffset && `
    left: ${props.leftOffset}px;
  `}

  ${props => props.topOffset && `
    top: ${props.topOffset}px;
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}
`;
