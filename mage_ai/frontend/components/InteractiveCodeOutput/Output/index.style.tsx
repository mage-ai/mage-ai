import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { LOADING_HEIGHT } from '@oracle/components/Loading';

const SHARED_HIDDEN_STYLES = css`
  bottom: 0;
  opacity: 0;
  position: fixed;
  right: 0;
  visibility: hidden;
  z-index: -1;
`;

export const LoadingStyle = styled.div<{
  isIdle?: boolean;
}>`
  // position: absolute;
  height: ${LOADING_HEIGHT}px;
  width: 100%;

  .inactive {
    ${SHARED_HIDDEN_STYLES}
  }

  ${props => props.isIdle && `
    border-top: 1px solid ${(props.theme || dark).borders.light};
  `}
`;
