import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const SubheaderStyle = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeArea};
  `}
`;
