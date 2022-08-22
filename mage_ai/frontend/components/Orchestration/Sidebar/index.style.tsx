import styled from 'styled-components';

import { UNIT } from '@oracle/styles/units/spacing';

export const EntryStyle = styled.div<any>`
  border-bottom: 1px solid #1C1C1C;

  background: #232429;
  padding: ${2 * UNIT}px;

  ${props => props.selected && `
    background: #2E3036;
  `}
`;
