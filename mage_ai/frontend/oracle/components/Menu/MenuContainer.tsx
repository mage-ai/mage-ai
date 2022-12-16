import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS_XLARGE } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export type MenuContainerProps = {
  bottom?: number;
  left?: number;
  right?: number;
  top?: number;
  width?: number;
};

const ContainerStyle = styled.div<MenuContainerProps>`
  border-radius: ${BORDER_RADIUS_XLARGE}px;
  max-height: 85vh;
  overflow: auto;
  padding: ${UNIT * 1.75}px;
  position: absolute;
  z-index: 101;

  ${props => `
    background-color: ${(props.theme.monotone || light.monotone).white};
    box-shadow: ${(props.theme.shadow || light.shadow).menu};
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

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => !props.width && `
    min-width: ${UNIT * 22}px;
  `}
`;

function MenuContainer({
  bottom,
  children,
  left,
  right,
  top,
  width,
}: MenuContainerProps & {
  children: any;
}) {
  return (
    <ContainerStyle
      bottom={bottom}
      left={left}
      right={right}
      top={top}
      width={width}
    >
      {children}
    </ContainerStyle>
  );
}

export default MenuContainer;
