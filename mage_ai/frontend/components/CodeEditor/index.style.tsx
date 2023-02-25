import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

export const NUMBER_OF_BUFFER_LINES = 2;
export const SINGLE_LINE_HEIGHT = 21;

export const ContainerStyle = styled.div<{
  padding?: boolean;
}>`
  ${props => props.padding && `
    padding-top: ${UNIT * 2}px;
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;

export const PlaceholderStyle = styled.div`
  padding-left: 67px;
  position: absolute;
  z-index: 1;
`;
