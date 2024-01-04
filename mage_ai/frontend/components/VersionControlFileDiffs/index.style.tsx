import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XLARGE } from '@oracle/styles/units/borders';

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS_XLARGE}px;
  height: inherit;
  width: inherit;

  ${props => `
    background-color: #18181C;
  `}
`;
