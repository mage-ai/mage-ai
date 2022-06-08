import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const BEFORE_WIDTH = UNIT * 40;
const AFTER_WIDTH = UNIT * 50;

export const HeaderStyle = styled.div<{
  beforeVisible?: boolean;
}>`
  position: fixed;
  z-index: 2;

  ${props => `
    border-bottom: 1px solid ${(props.theme.monotone || light.monotone).grey200};
  `}

  ${props => !props.beforeVisible && `
    width: 100%;
  `}

  ${props => props.beforeVisible && `
    left: ${BEFORE_WIDTH}px;
    width: calc(100% - ${BEFORE_WIDTH}px);
  `}
`;

export const TabStyle = styled.div<{
  first: boolean;
  selected: boolean;
}>`
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  padding: ${UNIT * 1}px ${UNIT * 2}px;
  position: relative;
  top: 1px;

  ${props => `
    border-left: 1px solid ${(props.theme.monotone || light.monotone).grey200};
    border-right: 1px solid ${(props.theme.monotone || light.monotone).grey200};
    border-top: 1px solid ${(props.theme.monotone || light.monotone).grey200};
  `}

  ${props => !props.first && `
    margin-left: ${UNIT * 1}px;
  `}

  ${props => props.selected && `
    border-bottom: 1px solid ${(props.theme.monotone || light.monotone).white};
  `}
`;

export const BeforeStyle = styled.aside`
  height: 100%;
  left: 0;
  position: fixed;
  width: ${BEFORE_WIDTH}px;
  z-index: 1;

  ${props => `
    background-color: ${(props.theme.monotone || light.monotone).grey100};
  `}
`;

export const BeforeInnerStyle = styled.div`
  height: 100%;
  overflow: auto;
`;

export const MainContentStyle = styled.div<{
  beforeVisible?: boolean;
  headerOffset?: number;
}>`
  position: fixed;
  z-index: 1;

  ${props => !props.beforeVisible && `
    width: calc(100% - ${AFTER_WIDTH}px);
  `}

  ${props => props.beforeVisible && `
    left: ${BEFORE_WIDTH}px;
    width: calc(100% - ${BEFORE_WIDTH + AFTER_WIDTH}px);
  `}

  ${props => props.headerOffset && `
    height: calc(100% - ${props.headerOffset}px);
    top: ${props.headerOffset}px;
  `}
`;

export const MainContentInnerStyle = styled.div`
  height: 100%;
  overflow: auto;
`;

export const AsideStyle = styled.aside<{
  headerOffset?: number;
}>`
  right: 0;
  position: fixed;
  width: ${AFTER_WIDTH}px;
  z-index: 1;

  ${props => props.headerOffset && `
    height: calc(100% - ${props.headerOffset}px);
    top: ${props.headerOffset}px;
  `}
`;

export const AsideInnerStyle = styled.div`
  height: 100%;
  overflow: auto;
`;

export const AsidePopoutStyle = styled.div`
  margin-top: ${PADDING_UNITS * UNIT}px;
  position: fixed;
  right: ${PADDING_UNITS * UNIT}px;
  width: ${AFTER_WIDTH * 1.3}px;
  z-index: 3;
`;
