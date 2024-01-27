import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const OverlayStyle = styled.div`
  ${props => `
    background-color: ${(props.theme.background || dark.background).codeArea};
  `}
`;
