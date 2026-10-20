import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XLARGE, BORDER_WIDTH_THICK } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const DIVIDER_WIDTH = 3 * UNIT;

export const DividerStyle = styled.div<{
  horizontal?: boolean;
}>`
  display: flex;
  position: relative;

  ${props => !props.horizontal && `
    height: 100%;
    justify-content: center;
    width: ${DIVIDER_WIDTH}px;
  `};

  ${props => props.horizontal && `
    align-items: center;
    height: ${DIVIDER_WIDTH}px;
    margin-left: ${DIVIDER_WIDTH}px;
    margin-right: ${DIVIDER_WIDTH}px;
    width: calc(100% - ${2 * DIVIDER_WIDTH}px);
  `};
`;

export const BarStyle = styled.div<{
  horizontal?: boolean;
}>`
  border-radius: ${BORDER_RADIUS_XLARGE}px;

  // &:hover {
  //   cursor: col-resize;
  // }

  ${props => `
    background-color: ${(props.theme || dark).accent.blueLight};
  `}

  ${props => !props.horizontal && `
    height: 100%;
    width: ${0.5 * UNIT}px;
  `};

  ${props => props.horizontal && `
    height: ${0.5 * UNIT}px;
    width: 100%;
  `};
`;

export const ButtonStyle = styled.a<{
  horizontal?: boolean;
}>`
  align-items: center;
  border-radius: 50%;
  display: flex;
  height: ${3 * UNIT}px;
  justify-content: center;
  position: absolute;
  width: ${3 * UNIT}px;

  ${props => `
    background-color: ${(props.theme || dark).background.page};
    border: ${BORDER_WIDTH_THICK}px solid ${(props.theme || dark).accent.blueLight};
    box-shadow:
      0 0 0 ${BORDER_WIDTH_THICK}px ${(props.theme || dark).background.page};

    &:hover {
      background-color: ${(props.theme || dark).interactive.linkPrimary};
      border: ${BORDER_WIDTH_THICK}px solid ${(props.theme || dark).interactive.linkPrimary};
      cursor: pointer;
    }
  `}

  ${props => !props.horizontal && `
    top: ${3 * UNIT}px;
  `};

  ${props => props.horizontal && `
    left: ${3 * UNIT}px;
  `};
`;
