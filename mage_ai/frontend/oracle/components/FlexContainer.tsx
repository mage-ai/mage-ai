import React from 'react';
import styled from 'styled-components';
import { flexbox, FlexboxProps } from 'styled-system';

type FlexContainerProps = {
  children: any | any[];
  fullHeight?: boolean;
  fullScreenHeight?: boolean;
  fullWidth?: boolean;
  offsetHeight?: number;
  relative?: boolean;
  textOverflow?: boolean;
  verticalHeight?: number;
  verticalHeightOffset?: number;
  width?: number;
  wrap?: boolean;
} & FlexboxProps;

const FlexContainerStyle = styled.div<FlexContainerProps>`
  ${flexbox}

  display: flex;

  ${props => props.verticalHeight && `
    height: calc(${props.verticalHeight}vh - ${props.verticalHeightOffset}px);
  `}

  ${props => !props.verticalHeight && Number(props.offsetHeight) > 0 && `
    height: calc(100% - ${props.offsetHeight || 0}px);
  `}

  ${props => props.fullHeight && !props.verticalHeight && `
    height: calc(100% - ${props.offsetHeight || 0}px);
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}

  ${props => props.fullScreenHeight && !props.offsetHeight && `
    min-height: 100vh;
  `}

  ${props => props.fullScreenHeight && props.offsetHeight && `
    min-height: calc(100vh - ${props.offsetHeight}px);
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => props.relative && `
    position: relative;
  `}

  ${props => props.textOverflow && `
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}
`;

const FlexContainer = React.forwardRef(({
  children,
  fullHeight = true,
  verticalHeightOffset = 0,
  wrap,
  ...props
}: FlexContainerProps, ref) => (
  <FlexContainerStyle
    {...props}
    fullHeight={fullHeight}
    verticalHeightOffset={verticalHeightOffset}
  >
    {children}
  </FlexContainerStyle>
));

export default FlexContainer;
