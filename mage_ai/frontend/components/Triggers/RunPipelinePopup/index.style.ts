import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const ToggleStyle = styled.div<{
  borderless?: boolean;
}>`
  padding: ${UNIT * 1.5}px ${UNIT * 2}px;
  border-radius: ${BORDER_RADIUS}px;

  ${props => !props.borderless && `
    border: 1px solid ${(props.theme || dark).borders.light};
    background-color: ${(props.theme || dark).background.popup};
  `}
`;
