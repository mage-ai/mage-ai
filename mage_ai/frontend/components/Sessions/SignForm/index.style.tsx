import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_LARGE, BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { PADDING_LARGE, UNIT } from '@oracle/styles/units/spacing';

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS_LARGE}px;
  padding-bottom: ${UNIT * 21}px;
  padding-left: ${PADDING_LARGE}px;
  padding-right: ${PADDING_LARGE}px;
  padding-top: ${PADDING_LARGE}px;
  width: 100%;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;

export const BackgroundImageStyle = styled.div<{
  src: string
}>`
  border-radius: ${BORDER_RADIUS_XXXLARGE}px;
  font-size: 0;
  overflow: hidden;

  ${props => props.src && `
    background-image: url(${props.src});
    background-size: cover;
    background-repeat: no-repeat;
    height: 100%;
    width: 100%;
  `}
`;
