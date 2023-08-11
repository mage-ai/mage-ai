import React from 'react';
import { MarginProps, PaddingProps } from 'styled-system';

import Spacing from '../Spacing';
import {
  DividerContainerStyle,
  DividerStyle,
} from './index.style';

export type DividerProps = {
  black?: boolean;
  light?: boolean;
  medium?: boolean;
  muted?: boolean;
  prominent?: boolean;
  short?: boolean;
} & MarginProps & PaddingProps;

const Divider = ({
  short = false,
  ...props
}: DividerProps) => (
  <DividerContainerStyle short={short}>
    <Spacing {...props}>
      <DividerStyle {...props} />
    </Spacing>
  </DividerContainerStyle>
);

export default Divider;
