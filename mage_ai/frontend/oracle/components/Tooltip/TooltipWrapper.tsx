import React, { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { OUTLINE_OFFSET, OUTLINE_WIDTH } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { selectOutlineColor } from '@oracle/elements/Button';
import { transition } from '@oracle/styles/mixins';

export type TooltipWrapperProps = {
  alignLeft?: boolean;
  appearAbove?: boolean;
  appearBefore?: boolean;
  autoHide?: boolean;
  autoWidth?: boolean;
  basic?: boolean;
  block?: boolean;
  bottomOffset?: number;
  center?: boolean;
  children?: any;
  default?: boolean;
  description?: any | string;
  forceVisible?: boolean;
  height?: number;
  fullSize?: boolean;
  inline?: boolean;
  label?: string | any;
  leftPosition?: number;
  lightBackground?: boolean;
  maxWidth?: number;
  minWidth?: number;
  muted?: boolean;
  noHoverOutline?: boolean;
  relativePosition?: boolean;
  rightPosition?: boolean;
  size?: number;
  topOffset?: number;
  visibleDelay?: number;
  warning?: boolean;
  widthFitContent?: boolean;
};

const SHARED_CONTAINER_STYLES = css<TooltipWrapperProps>`
  position: static;

  ${({ relativePosition }) => relativePosition && `
    position: relative;
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${props => props.size && `
    height: ${props.size}px;
  `}

  ${props => props.fullSize && `
    height: 100%;
  `}
`;

const ContainerStyle = styled.div`
  ${SHARED_CONTAINER_STYLES}
`;

const ContainerSpanStyle = styled.span`
  ${SHARED_CONTAINER_STYLES}
`;

const HoverStyle = styled.div<TooltipWrapperProps>`
  ${transition()}

  ${props => props.size && `
    height: ${props.size}px;
    width: ${props.size}px;
  `}

  ${props => props.fullSize && `
    height: 100%;
    width: 100%;
  `}

  border-radius: 50%;

  ${props => !props.block && `
    display: inline-block;
  `}

  ${props => props.block && `
    display: block;
  `}

  &:active,
  &:focus {
    outline: none;
  }

  ${props => props.noHoverOutline && `
    &:hover {
      cursor: pointer;
    }
  `}

  ${props => !props.noHoverOutline && `
    &:hover {
      cursor: pointer;

      box-shadow:
        0 0 0 ${OUTLINE_OFFSET}px ${selectOutlineColor(props)},
        0 0 0 ${OUTLINE_OFFSET + OUTLINE_WIDTH}px ${(props.theme.interactive || dark.interactive).hoverOverlay};
    }
  `}
`;

const BasicStyle = styled.span``;

const ContentStyle = styled.div<TooltipWrapperProps>`
  position: absolute;
  z-index: 3;

  ${props => `
    box-shadow: ${(props.theme.shadow || dark.shadow).base};
  `}

  ${props => props.lightBackground && `
    box-shadow: ${(props.theme.shadow || dark.shadow).window};
  `}

  ${props => props.appearAbove && !props.size && `
    bottom: 0;
  `}

  ${props => props.appearAbove && props.size && `
    bottom: ${props.size + OUTLINE_OFFSET + OUTLINE_WIDTH}px;
  `}

  ${props => props.appearBefore && `
    right: ${UNIT * 2}px;
  `}

  ${props => props.leftPosition && `
    left: ${props.leftPosition}px;
  `}

  ${props => !props.leftPosition && props.rightPosition && `
    right: 0px;
  `}

  ${props => props.minWidth && `
    min-width: ${props.minWidth}px;
  `}

  ${props => props.widthFitContent && `
    width: max-content;
  `}

  ${props => props.topOffset && `
    top: ${props.topOffset}px;
  `}

  ${props => props.bottomOffset && `
    bottom: ${props.bottomOffset}px;
  `}
`;

function TooltipWrapper({
  alignLeft,
  appearAbove,
  appearBefore,
  autoHide,
  autoWidth,
  basic,
  block,
  bottomOffset,
  center,
  children,
  content,
  forceVisible = false,
  fullSize,
  height,
  inline,
  lightBackground,
  minWidth,
  noHoverOutline,
  relativePosition,
  size = UNIT * 2,
  topOffset,
  visibleDelay = 1000,
  widthFitContent,
}: TooltipWrapperProps & {
  content: any;
  minWidth?: number;
}) {
  const [visibleInterval, setVisibleInterval] = useState(false);
  const [visible, setVisible] = useState(false);
  const leftPosition = (minWidth - size) / -2;
  const ContainerEl = inline ? ContainerSpanStyle : ContainerStyle;
  const El = basic ? BasicStyle : HoverStyle;
  const elRendered = (
    // @ts-ignore
    <El
      block={block}
      fullSize={fullSize}
      href="#"
      noHoverOutline={noHoverOutline}
      onClick={e => e.preventDefault()}
      onMouseEnter={() => setVisibleInterval(true)}
      size={size}
    >
      {children}
    </El>
  );

  useEffect(() => {
    const interval = setInterval(() => setVisible(true), visibleDelay);

    if (!visibleInterval) {
      clearInterval(interval);
    }

    if (autoHide) {
      setTimeout(() => {
        setVisibleInterval(false);
        setVisible(false);
      }, visibleDelay * 3);
    }

    return () => clearInterval(interval);
  }, [
    autoHide,
    setVisible,
    visibleDelay,
    visibleInterval,
  ]);

  return (
    <ContainerEl
      fullSize={fullSize}
      height={height}
      onMouseLeave={() => {
        setVisibleInterval(false);
        setVisible(false);
      }}
      relativePosition={relativePosition}
      size={size}
    >
      {elRendered}

      {(visible || forceVisible) && (
        <ContentStyle
          appearAbove={appearAbove}
          appearBefore={appearBefore}
          bottomOffset={bottomOffset}
          leftPosition={center ? leftPosition : null}
          lightBackground={lightBackground}
          minWidth={autoWidth ? minWidth : null}
          rightPosition={alignLeft}
          size={size}
          topOffset={topOffset}
          widthFitContent={widthFitContent}
        >
          {content}
        </ContentStyle>
      )}
    </ContainerEl>
  );
}

export default TooltipWrapper;
