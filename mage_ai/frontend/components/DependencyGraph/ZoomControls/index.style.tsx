import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_PILL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const ZoomControlsStyle = styled.div`
  display: flex;
  justify-content: center;

  position: absolute;
  bottom: ${UNIT * 3}px;
  left: 50%;
  transform: translateX(-50%);

  background-color: ${props => (props.theme.background || dark.background).panel};
  border: 1px solid ${props => (props.theme.borders || dark.borders).darkLight};
  border-radius: ${BORDER_RADIUS_PILL}px;
  box-shadow: ${props => (props.theme.shadow || dark.shadow).frame};
`;

export const ZoomDisplayStyle = styled.div`
  padding: ${UNIT * 1.5}px ${UNIT * 3.25}px ${UNIT * 1.5}px ${UNIT * 1.875}px;
  
  border-radius: 0 ${BORDER_RADIUS_PILL}px ${BORDER_RADIUS_PILL}px 0;
  cursor: default;
`;
