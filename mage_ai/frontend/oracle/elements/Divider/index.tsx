import React from 'react';
import styled from 'styled-components';
import { MarginProps, PaddingProps } from 'styled-system';

import Spacing from '../Spacing';
import dark from '../../styles/themes/dark';
import { ThemeType } from '../../styles/themes/constants';

export type DividerProps = {
  black?: boolean;
  dark?: boolean;
  light?: boolean;
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

  ${props => !props.light && `
    background-color: ${(props.theme.monotone || dark.monotone).grey200};
  `}

  ${props => props.light && `
    background-color: ${(props.theme.borders || dark.borders).light};
  `}
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
