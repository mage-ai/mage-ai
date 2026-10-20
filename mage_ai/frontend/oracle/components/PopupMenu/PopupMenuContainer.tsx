import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { HEADER_HEIGHT, HEADER_Z_INDEX } from '@components/constants';
import { UNIT } from '@oracle/styles/units/spacing';

export type PopupMenuContainerProps = {
  bottom?: number
  centerOnScreen?: boolean;
  left?: number;
  right?: number;
  top?: number;
  width?: number;
};

const ContainerStyle = styled.div<PopupMenuContainerProps>`
  border-radius: ${BORDER_RADIUS_LARGE}px;
  padding: ${UNIT * 2}px;
  position: absolute;
  z-index: ${HEADER_Z_INDEX + 100};
  cursor: default;

  ${props => `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
    box-shadow: ${(props.theme.shadow || dark.shadow).window};
  `}

  ${props => typeof props.left !== 'undefined' && `
    left: ${(props.left)}px;
  `}

  ${props => typeof props.right !== 'undefined' && `
    right: ${(props.right)}px;
  `}

  ${props => typeof props.top !== 'undefined' && `
    top: ${(props.top)}px;
  `}

  ${props => typeof props.bottom !== 'undefined' && `
    bottom: ${(props.bottom)}px;
  `}

  ${props => typeof props.top === 'undefined' && typeof props.bottom === 'undefined' && `
    top: ${HEADER_HEIGHT - (UNIT * 1)}px;
  `}

  ${props => props.centerOnScreen && `
    top: 40%;
    left: 50%;
    transform: translate(-50%,-50%);
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => !props.width && `
    min-width: ${UNIT * 33}px;
  `}
`;

function PopupMenuContainer({
  bottom,
  centerOnScreen,
  children,
  left,
  right,
  top,
  width,
}: PopupMenuContainerProps & {
  children: any;
}) {
  return (
    <ContainerStyle
      bottom={bottom}
      centerOnScreen={centerOnScreen}
      left={left}
      right={right}
      top={top}
      width={width}
    >
      {children}
    </ContainerStyle>
  );
}

export default PopupMenuContainer;
