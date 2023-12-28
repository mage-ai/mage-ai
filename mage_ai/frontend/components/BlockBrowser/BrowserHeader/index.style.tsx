import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { UNIT } from '@oracle/styles/units/spacing';

export const HeaderStyle = styled.div`
  height: ${HEADER_HEIGHT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;
