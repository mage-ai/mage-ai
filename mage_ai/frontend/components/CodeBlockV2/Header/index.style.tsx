import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = UNIT * 2.5;

export const HeaderWrapperStyle = styled.div`
  &:hover {
    .chevron-down-exit-done {
      transform: translate(0, 0);
      transition: all 200ms;
    }
    .chevron-down-enter-active {
      transform: translate(0, ${UNIT * 0.75}px);
      transition: all 200ms;
    }
    .chevron-down-enter-done,
    .chevron-down-enter-done-visible {
      transform: translate(0, ${UNIT * 0.75}px);
      transition: all 300ms;
    }
    .chevron-down-exit {
      transform: translate(0, 0);
      transition: all 300ms;
    }
  }
`;

export const HeaderStyle = styled.div`
  align-items: center;
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  display: flex;
  justify-content: space-between;
  padding: ${UNIT * 1}px;

  ${props => `
    background-color: ${(props.theme || dark).background.chartBlock};
  `}
`;

export const SubheaderButtonStyle = styled.div`
  bottom: -${1.5 * UNIT}px;
  left: 0;
  margin-left: auto;
  margin-right: auto;
  position: absolute;
  right: 0;
  width: ${ICON_SIZE}px;
`;
