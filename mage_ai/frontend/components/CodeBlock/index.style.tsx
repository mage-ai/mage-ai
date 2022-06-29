import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

type ContainerProps = {
};

export const ContainerStyle = styled.div<ContainerProps>`
  border-radius: ${BORDER_RADIUS}px;
  padding-bottom: ${UNIT}px;
  padding-top: ${UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;
