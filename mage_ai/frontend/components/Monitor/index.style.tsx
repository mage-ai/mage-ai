import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING, UNIT } from '@oracle/styles/units/spacing';

export const LinkStyle = styled.div<any>`
  padding: ${UNIT}px ${PADDING}px;

  ${props => props.selected && `
    background-color: ${(props.theme.interactive || dark.interactive).checked};
  `}

  ${props => !props.selected && `
    cursor: pointer;
  `}
`;
