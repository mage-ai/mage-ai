import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const CHART_HEIGHT_DEFAULT = UNIT * 40;

export const DropZoneStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${UNIT * 8}px;
  max-width: ${UNIT * 100}px;
  min-width: ${UNIT * 55}px;

  ${props => `
    border: 1px dashed ${(props.theme.borders || dark.borders).contrast};
  `}
`;

export const TableStyle = styled.div`
  max-width: ${UNIT * 100}px;
  min-width: ${UNIT * 55}px;
`;
