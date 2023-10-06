import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING } from '@oracle/styles/units/spacing';

export const ContainerStyle = styled.div<{ $height: number }>`
  display: flex;
  flex-direction: column;
  height: ${props => props.$height}px;
  padding: ${PADDING}px;
  border-bottom: 1px solid ${dark.borders.medium};
`;
