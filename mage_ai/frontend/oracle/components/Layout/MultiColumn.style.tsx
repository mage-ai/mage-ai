import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

const AFTER_WIDTH = UNIT * 50;
const AFTER_MARGIN = PADDING_UNITS * UNIT;
export const AFTER_TOTAL_WIDTH = (UNIT * 40) + AFTER_MARGIN;

export const HeaderStyle = styled.div`
  position: fixed;
  width: 100%;

  ${props => `
    border-bottom: 1px solid ${(props.theme.monotone || light.monotone).grey200};
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

export const MainContentStyle = styled.div<{
  headerOffset?: number;
}>`
  position: fixed;
  width: calc(100% - ${AFTER_WIDTH}px);

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

  ${props => props.headerOffset && `
    height: calc(100% - ${props.headerOffset}px);
    top: ${props.headerOffset}px;
  `}
`;

export const AsideInnerStyle = styled.div`
  height: 100%;
  overflow: auto;
}
`;
