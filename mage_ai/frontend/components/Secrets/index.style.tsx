import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';


export const ContainerStyle = styled.div`
  height: 100%;
`;

export const ButtonsStyle = styled.div`
  margin-top: ${PADDING_UNITS * UNIT}px;
  width: 100%;

  ${props => `
    border-top: 1px solid ${(props.theme.borders || dark.borders).light};
  `}
`;
