import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { hideScrollBar } from '@oracle/styles/scrollbars';

export const ICON_SIZE = UNIT * 2;
export const MENU_ICON_SIZE = UNIT * 1.5;

export const HeaderWrapperStyle = styled.div<{
  subheaderVisible: boolean;
}>`
  ${props => props.subheaderVisible && `
    &:hover {
      .chevron-down-exit-done {
        transform: translate(0, 0);
        transition: all 200ms;
      }
      .chevron-down-enter-active {
        transform: translate(0, ${UNIT * -0.75}px);
        transition: all 200ms;
      }
      .chevron-down-enter-done,
      .chevron-down-enter-done-visible {
        transform: translate(0, ${UNIT * -0.75}px);
        transition: all 300ms;
      }
      .chevron-down-exit {
        transform: translate(0, 0);
        transition: all 300ms;
      }
    }
  `}

  ${props => !props.subheaderVisible && `
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
  `}
`;

export const HeaderStyle = styled.div`
  align-items: center;
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  display: flex;
  justify-content: space-between;
  padding: ${UNIT * 1}px;

  ${props => `
    background-color: ${(props.theme || dark).background.dashboard};
  `}
`;

export const InfoStyle = styled.div`
  ${hideScrollBar()}

  align-items: center;
  display: flex;
  overflow: auto;
`;

export const SubheaderButtonStyle = styled.div`
  bottom: -${2.75 * UNIT}px;
  left: 0;
  margin-left: auto;
  margin-right: auto;
  position: absolute;
  right: 0;
  width: ${ICON_SIZE}px;
  z-index: 11;
`;

export const SubheaderStyle = styled.div`
  position: relative;
  z-index: 10;
`;

export const SubheaderMenuStyle = styled.div`
  padding-bottom: ${UNIT / 2}px;
  padding-top: ${UNIT / 2}px;
`;

export const TagStyle = styled.div<{
  backgroundColor?: string;
}>`
  align-items: center;
  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: flex;
  padding: 2px ${UNIT * 1}px;
  margin-right: ${UNIT * 1}px;

  ${props => `
    background-color: ${props.backgroundColor || (props.theme || dark).background.chartBlock};
  `}
`;
