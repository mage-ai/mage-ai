import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  padding: ${UNIT}px;
  position: absolute;
  right: -${UNIT / 2}px;
  top: ${UNIT}px;
  z-index: 1;

  ${props =>  `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
  `}
`;
