import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';

export const BeforeStyle = styled.div`
  min-height: calc(100vh - ${HEADER_HEIGHT}px);

  ${props => `
    border-left: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;
