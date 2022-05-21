import React from 'react';
import styled from 'styled-components';
import { MarginProps, PaddingProps } from 'styled-system';

import Spacing from '../Spacing';
import light from '../../styles/themes/light';
import { ThemeType } from '../../styles/themes/constants';

export type DividerProps = {
  black?: boolean;
  dark?: boolean;
  muted?: boolean;
  prominent?: boolean;
  short?: boolean;
  theme?: ThemeType;
  wind?: boolean;
} & MarginProps & PaddingProps;

const DividerContainerStyle = styled.div<DividerProps>`
  ${props => props.short && `
    width: 30%;
  `}

  ${props => !props.short && `
    width: 100%;
  `}
`;

const DividerStyle = styled.div<DividerProps>`
  height: 1px;
  background-color: ${light.monotone.black};
`;

const Divider = ({ short, ...props }: DividerProps) => (
  <DividerContainerStyle short={short}>
    <Spacing {...props}>
      <DividerStyle {...props} />
    </Spacing>
  </DividerContainerStyle>
);

Divider.defaultProps = {
  short: false,
};

export default Divider;
