import React from 'react';
import styled from 'styled-components';
import { MarginProps, PaddingProps, space } from 'styled-system';

type SpacingProps = {
  children?: any;
  fullHeight?: boolean;
  fullWidth?: boolean;
  inline?: boolean;
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
}: SpacingProps) {
  return (
    <SpacingStyle
      {...props}
      inline={inline}
    >
      {children}
    </SpacingStyle>
  );
}

export default React.forwardRef(Spacing);
