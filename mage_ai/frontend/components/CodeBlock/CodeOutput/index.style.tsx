import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

// Look at the code editor div class "margin" and role "presentation"
const LEFT_PADDING = 68;

export const ContainerStyle = styled.div`
  padding-left: ${LEFT_PADDING}px;
  padding-bottom: ${UNIT * PADDING_UNITS}px;
  padding-right: ${UNIT * PADDING_UNITS}px;
  padding-top: ${UNIT * PADDING_UNITS}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).table};
  `}
`;

export const ExtraInfoStyle = styled.div`
  padding-left: ${LEFT_PADDING}px;
  padding-bottom: ${UNIT}px;
  padding-right: ${UNIT* PADDING_UNITS}px;
  padding-top: ${UNIT}px;

  ${props => `
    background-color: ${(props.theme.borders || dark.borders).light};
    border-top: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;
