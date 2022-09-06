import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const ErrorPopupStyle = styled.div`
  bottom: 0;
  left: 0;
  max-height: 100vh;
  max-width: 100vw;
  overflow: auto;
  padding: ${UNIT * PADDING_UNITS}px;
  position: fixed;
  z-index: 100;

  ${props => `
    background-color: ${(props.theme.background || dark.background).page};
    border-right: 1px solid ${(props.theme.accent || dark.accent).negative};
    border-top: 1px solid ${(props.theme.accent || dark.accent).negative};
  `}
`;
