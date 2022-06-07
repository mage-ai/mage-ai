import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

const AFTER_WIDTH = UNIT * 50;
const AFTER_MARGIN = PADDING_UNITS * UNIT;;
export const AFTER_TOTAL_WIDTH = (UNIT * 40) + AFTER_MARGIN;

export const HeaderStyle = styled.div`
  position: fixed;
  width: 100%;
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
