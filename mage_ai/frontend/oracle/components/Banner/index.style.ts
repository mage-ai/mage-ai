import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_PILL } from '@oracle/styles/units/borders';
import { PADDING_VERTICAL } from '@oracle/styles/units/spacing';
import { UNIT } from '@oracle/styles/units/spacing';

export const BannerContainerStyle = styled.div<{
  hide?: boolean;
}>`
  position: absolute;
  z-index: 5;
  left: 0;
  right: 0;
  margin: auto;
  width: fit-content;

  ${({ hide }) => hide && `
    display: none;
  `}

  // Default position is at bottom of page
  bottom: ${PADDING_VERTICAL}px;
`;

export const BannerStyle = styled.div`
  padding: ${PADDING_VERTICAL}px ${UNIT * 3.75}px;
  border-radius: ${BORDER_RADIUS_PILL}px;
  background-color: ${dark.monotone.black};
`;
