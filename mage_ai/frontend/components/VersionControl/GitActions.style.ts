import styled from 'styled-components';

import { HEADER_HEIGHT } from '@components/constants';


export const HeaderStyle = styled.div<any>`
  border-bottom: 1px solid #1B1C20;
  height: ${HEADER_HEIGHT}px;

  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const TerminalStyle = styled.div<any>`
  height: calc(75vh - ${HEADER_HEIGHT}px);
  position: relative;
`;
