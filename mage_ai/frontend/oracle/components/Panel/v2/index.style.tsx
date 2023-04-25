import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';

export const PanelStyle = styled.div<any>`
  border-radius: ${BORDER_RADIUS}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}
`;
