import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING } from '@oracle/styles/units/spacing';

export const ContainerStyle = styled.div<{
  height: number;
  includePadding?: boolean;
  overflow?: boolean;
}>`
  display: flex;
  flex-direction: column;
  height: ${props => props.height}px;
  border-bottom: 1px solid ${dark.borders.medium};

  ${({ includePadding }) => includePadding && `
    padding: ${PADDING}px;
  `}

  ${({ overflow }) => overflow && `
    overflow: auto;
  `}
`;
