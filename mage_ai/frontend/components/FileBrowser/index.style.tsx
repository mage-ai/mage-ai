import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = UNIT * 1.5;
export const INDENT_WIDTH = (ICON_SIZE * 1) + (UNIT / 2);

export const ContainerStyle = styled.div`
  .row:hover {
    ${props => `
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    `}
  }
`;
