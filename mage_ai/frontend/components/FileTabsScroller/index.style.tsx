import styled from 'styled-components';

import { hideScrollBar } from '@oracle/styles/scrollbars';

export const ScrollerStyle = styled.div`
  ${hideScrollBar()}

  align-items: center;
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: auto;
`;
