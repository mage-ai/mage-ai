import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';

export const StatusFooterStyle = styled.div<{
  width?: number;
}>`
  bottom: 0;
  position: fixed;
  z-index: 2;

  ${props => `
    background-color: ${(props.theme.background || dark.background).header};
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}
`;
