import styled from 'styled-components';

import { HEADER_HEIGHT } from '@components/shared/Header/index.style';

export const ContainerStyle = styled.div<{
  fullHeight?: boolean;
}>`
  padding-top: ${HEADER_HEIGHT}px;

  ${props => props.fullHeight && `
    height: calc(100vh);
  `}
`;
