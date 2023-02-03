import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { PADDING_LARGE, UNIT } from '@oracle/styles/units/spacing';

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS_LARGE}px;
  padding-bottom: ${UNIT * 13}px;
  padding-left: ${PADDING_LARGE}px;
  padding-right: ${PADDING_LARGE}px;
  padding-top: ${PADDING_LARGE}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;
