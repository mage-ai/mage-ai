import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import styled from 'styled-components';

export const ModalStyle = styled.div<{
  left?: number;
  top?: number;
}>`
  position: absolute;

  ${props => props.top && `
    top: ${props.top}px;
  `}

  ${props => props.left && `
    left: ${props.left}px;
  `}

  display: flex;
  flex-direction: column;
  width: ${UNIT * 39}px;
  overflow: hidden;

  background-color: ${props => (props.theme || dark).background.dashboard};
  border: 1px solid ${props => (props.theme || dark).borders.darkLight};
  border-radius: ${BORDER_RADIUS}px;
  box-shadow: ${props => (props.theme || dark).shadow.popup};
`;

export const ContentStyle = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${UNIT * 2}px;

  padding: ${UNIT * 2.5}px ${UNIT * 2}px;
`;

export const ActionsStyle = styled.div`
  display: flex;
  gap: ${UNIT}px;
  padding: ${UNIT * 2}px;

  background-color: ${props => (props.theme || dark).background.panel};
  border-top: 1px solid ${props => (props.theme || dark).borders.darkLight};

  & > * {
    flex: 1;
  }
`;
