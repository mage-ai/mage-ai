import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

export const ErrorPopupStyle = styled.div`
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-height: 95vh;
  max-width: 95vw;
  overflow: auto;
  padding: ${UNIT * PADDING_UNITS}px;
  position: fixed;
  z-index: 9999;
  border-radius: ${BORDER_RADIUS}px;

  ${props => `
    background-color: ${(props.theme || dark).background.page};
    border: 1px solid ${(props.theme || dark).accent.negative};
    box-shadow: ${(props.theme || dark).shadow.window};
  `}

  ${ScrollbarStyledCss}
`;

export const CloseButtonContainerStyle = styled.div`
  display: flex;
  justify-content: flex-end;
  position: sticky;
  top: 0;
`;
