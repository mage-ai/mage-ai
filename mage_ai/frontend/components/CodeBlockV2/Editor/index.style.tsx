import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_PILL, BORDER_WIDTH_THICK } from '@oracle/styles/units/borders';
import { LEFT_PADDING } from '@components/CodeBlock/index.style';
import { UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = UNIT * 2.5;

export const EditorWrapperStyle = styled.div`
  position: relative;
`;

export const ButtonStyle = styled.div`
  height: ${ICON_SIZE}px;
  position: absolute;
  left: ${UNIT / 2}px;
  width: ${ICON_SIZE}px;
  z-index: 7;
`;

export const InputStyle = styled.div<{
  color: string;
}>`
  border-radius: ${BORDER_RADIUS_PILL}px;
  display: none;
  left: ${LEFT_PADDING}px;
  padding-left: ${UNIT * 1}px;
  padding-right: ${(UNIT * 2) + ICON_SIZE}px;
  position: absolute;
  z-index: 100;

  ${props => `
    background-color: ${(props.theme || dark).background.dashboard};
    border: ${BORDER_WIDTH_THICK}px solid ${props?.color};
  `}
`;

export const TextInputFocusAreaStyle = styled.div`
  width: 100%;

  &:hover {
    cursor: text;
  }
`;

export const CloseStyle = styled.div`
  position: absolute;
  right: ${UNIT * 1}px;
  top: 50%;
  transform: translateY(-50%);
`;
