import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_STYLE, BORDER_WIDTH } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

const HEADER_HEIGHT = UNIT * 6;
const MAX_WIDTH = UNIT * 80;

export const WindowContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  height: fit-content;
  width: 100%;
  max-width: ${MAX_WIDTH}px;
  z-index: 101;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  ${props => `
    box-shadow: ${(props.theme || dark).shadow.window};
    background-color: ${(props.theme || dark).background.panel};
  `}
`;

const HEADER_STYLES = css`
  height: ${HEADER_HEIGHT}px;
  padding: ${UNIT * 1.5}px ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme || dark).background.output};
  `}
`;

export const WindowHeaderStyle = styled.div`
  ${HEADER_STYLES}
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;

  ${props => `
    border-bottom: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.medium};
  `}
`;

export const WindowContentStyle = styled.div`
  overflow: auto;
  padding: ${PADDING_UNITS * UNIT}px;
`;

export const WindowFooterStyle = styled.div`
  ${HEADER_STYLES}
  border-bottom-left-radius: ${BORDER_RADIUS}px;
  border-bottom-right-radius: ${BORDER_RADIUS}px;

  ${props => `
    border-top: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.medium};
  `}
`;
