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
  border: 1px solid ${props => (props.theme || dark).borders.darkLight};
  border-radius: ${BORDER_RADIUS_PILL}px;
  box-shadow: ${props => (props.theme.shadow || dark.shadow).frame};
`;
