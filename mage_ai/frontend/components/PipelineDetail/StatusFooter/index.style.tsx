import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';

export const StatusFooterStyle = styled.div<{
  inline?: boolean;
  width?: number;
}>`
  z-index: 2;

  ${props => `
    background-color: ${(props.theme.background || dark.background).header};
  `}

  ${props => !props.inline && `
    bottom: 0;
    position: fixed;
  `}

  ${props => typeof props.width !== 'undefined' && `
    width: ${props.width}px;
  `}
`;
