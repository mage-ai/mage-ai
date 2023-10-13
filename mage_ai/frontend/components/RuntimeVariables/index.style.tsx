import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';

export const ContainerStyle = styled.div<{ height: number }>`
  display: flex;
  flex-direction: column;
  height: ${props => props.height}px;
  border-bottom: 1px solid ${dark.borders.medium};
`;
