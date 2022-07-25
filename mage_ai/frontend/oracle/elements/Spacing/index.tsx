import React from 'react';
import styled from 'styled-components';
import { MarginProps, PaddingProps, space } from 'styled-system';

type SpacingProps = {
  children?: any;
  fullHeight?: boolean;
  fullWidth?: boolean;
  inline?: boolean;
  style?: {
    [key: string]: number | string;
  };
} & MarginProps & PaddingProps;

const SpacingStyle = styled.div<SpacingProps>`
  ${space}

  ${props => props.inline && `
    display: inline-block;
  `}

  ${props => props.fullHeight && `
    height: 100%;
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}
`;

function Spacing({
  children,
  inline,
  ...props
}: SpacingProps, ref) {
  return (
    <SpacingStyle
      {...props}
      inline={inline}
      ref={ref}
    >
      {children}
    </SpacingStyle>
  );
}

export default React.forwardRef(Spacing);
