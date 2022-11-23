import React from 'react';
import styled from 'styled-components';
import { MarginProps, PaddingProps } from 'styled-system';

import Spacing from '../Spacing';
import dark from '../../styles/themes/dark';
import { ThemeType } from '../../styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';

export type DividerProps = {
  black?: boolean;
  light?: boolean;
  medium?: boolean;
  muted?: boolean;
  prominent?: boolean;
  short?: boolean;
} & MarginProps & PaddingProps;

const DividerContainerStyle = styled.div<DividerProps>`
  ${props => props.short && `
    width: ${21 * UNIT}px;
  `}

  ${props => !props.short && `
    width: 100%;
  `}
`;

const DividerStyle = styled.div<DividerProps>`
  height: 1px;

  ${props => !(props.light || props.medium) && `
    background-color: ${(props.theme.monotone || dark.monotone).grey200};
  `}

  ${props => props.muted && `
    background-color: ${(props.theme.monotone || dark.monotone).grey500};
  `}

  ${props => props.light && `
    background-color: ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.medium && `
    background-color: ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => props.prominent && `
    background-color: ${(props.theme.monotone || dark.monotone).grey300};
  `}

  ${props => props.black && `
    background-color: ${(props.theme.monotone || dark.monotone).black};
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
