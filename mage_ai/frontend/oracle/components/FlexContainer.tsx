import React from 'react';
import styled, { css } from 'styled-components';
import { flexbox, FlexboxProps } from 'styled-system';
import { media } from 'styled-bootstrap-grid';

type FlexContainerProps = {
  children: any | any[];
  fullHeight?: boolean;
  fullScreenHeight?: boolean;
  fullWidth?: boolean;
  inline?: boolean;
  justifyContent?: string;
  offsetHeight?: number;
  relative?: boolean;
  responsive?: boolean;
  style?: {
    [key: string]: string | number;
  };
  textOverflow?: boolean;
  title?: string;
  verticalHeight?: number;
  verticalHeightOffset?: number;
  width?: number;
} & FlexboxProps;

export const JUSTIFY_CENTER_PROPS = {
  alignItems: 'center',
  justifyContent: 'center',
};

export const JUSTIFY_SPACE_BETWEEN_PROPS = {
  alignItems: 'center',
  justifyContent: 'space-between',
};

const SHARED_FLEX_DIRECTION_STYLE = css`
  flex-direction: column;
`;

const RESPONSIVE_FLEX_DIRECTION = css`
  ${media.xs`
    ${(props: any) => props.responsive && `
      ${SHARED_FLEX_DIRECTION_STYLE}
    `}
  `}

  ${media.sm`
    ${(props: any) => props.responsive && `
      ${SHARED_FLEX_DIRECTION_STYLE}
    `}
  `}

  ${media.md`
    ${(props: any) => props.responsive && `
      ${SHARED_FLEX_DIRECTION_STYLE}
    `}
  `}

  ${media.lg`
    ${(props: any) => props.responsive && `
      flex-direction: row;
    `}
  `}
`;

const FlexContainerStyle = styled.div<FlexContainerProps>`
  ${flexbox}

  ${RESPONSIVE_FLEX_DIRECTION}

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

  ${props => !props.inline && `
    display: flex;
  `}

  ${props => props.inline && `
    display: inline-flex;
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

const FlexContainer = ({
  children,
  fullHeight,
  verticalHeightOffset = 0,
  ...props
}: FlexContainerProps, ref) => (
  <FlexContainerStyle
    {...props}
    fullHeight={fullHeight}
    ref={ref}
    verticalHeightOffset={verticalHeightOffset}
  >
    {children}
  </FlexContainerStyle>
);

export default React.forwardRef(FlexContainer);
