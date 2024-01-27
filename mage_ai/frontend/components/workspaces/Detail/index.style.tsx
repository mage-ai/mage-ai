import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';

export const ContainerStyle = styled.div<any>`
  border: 1px solid;
  border-radius: 8px;
  ${props => `
    border-color: ${(props.theme.monotone || dark.monotone).grey500};
  `}
`;
