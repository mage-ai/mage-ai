import React from 'react';
import styled, { css } from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS } from '@oracle/styles/units/radius';
import { FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM } from '@oracle/styles/fonts/primary';
import { LARGE, REGULAR, SMALL } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

export type ButtonProps = {
  afterIcon?: any;
  basic?: boolean;
  beforeIcon?: any;
  bold?: boolean;
  borderColor?: string;
  centerText?: boolean;
  children?: any;
  color?: string;
  default?: boolean;
  disabled?: boolean;
  disabledColor?: boolean;
  fullWidth?: boolean;
  height?: number;
  href?: string;
  loading?: boolean;
  noPadding?: boolean;
  onClick?: (e?: Event) => void;
  outlineBackgroundColorSelector?: (theme: any) => string;
  padding?: number;
  pointerEventsEnabled?: boolean;
  positionRight?: boolean;
  selected?: boolean;
  spaceBetween?: boolean;
  target?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  width?: number;
};

export function selectOutlineColor(props: any) {
  if (props.outlineBackgroundColorSelector) {
    return props.outlineBackgroundColorSelector(props.theme);
  }

  return props.theme.background.page;
}

const SHARED_STYLES = css<ButtonProps>`
  border: none;
  display: block;
  position: relative;
  z-index: 0;

  ${props => props.pointerEventsEnabled && `
    pointer-events: all;
  `}

  ${props => (props.disabled || props.disabledColor) && `
    &:hover {
      cursor: not-allowed;
    }
  `}

  ${props => props.noPadding && `
    padding: 0;
  `}

  ${props => props.padding && `
    padding: ${props.padding}px !important;
  `}

  ${props => props.color && `
    background-color: ${props.color} !important;
  `}

  ${props => props.default && `
    color: ${props.theme.content.default};
  `}

  ${props => props.borderColor && `
    border-color: ${props.borderColor};
  `}

  ${props => props.selected && `
    background-color: ${props.theme.interactive.selectedBackgroundInverted};
  `}

  ${props => props.basic && `
    color: ${props.theme.content.active};
    background-color: transparent;
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${props => !props.bold && `
    font-family: ${FONT_FAMILY_MEDIUM};
  `}

  ${props => props.bold && `
    font-family: ${FONT_FAMILY_BOLD};
  `}

  ${props => (props.disabled || props.disabledColor) && `
    color: ${props.theme.content.disabled} !important;
  `}

  ${props => props.disabled && !props.basic && `
    background-color: ${props.theme.interactive.disabledBackground} !important;
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}
`;

const ButtonStyle = styled.button<ButtonProps>`
  ${SHARED_STYLES}

  ${props => props.positionRight && `
    position: absolute;
    right: 32px
  `}

  ${props => !props.positionRight && `
    position: relative;
  `}

`;

const Button = ({
  afterIcon,
  beforeIcon,
  centerText,
  children,
  disabled,
  href,
  loading,
  onClick,
  spaceBetween,
  type = 'button',
  ...props
}: ButtonProps, ref: any) => {
  const iconProps = {
    disabled,
    size: UNIT * 3,
  };

  return (
    <ButtonStyle
      {...props}
      disabled={disabled}
      href={href}
      onClick={(e) => {
        if (href) {
          if (typeof window !== 'undefined') {
            window.open(href, '_blank');
          }
        }

        if (onClick) {
          if (!href && e) {
            e.preventDefault();
          }

          onClick(e);
        }
      }}
      ref={ref}
      type={type}
    >
      <FlexContainer
        alignItems="center"
        justifyContent={centerText
          ? 'center'
          : (spaceBetween ? 'space-between' : null)
        }
      >
        {!loading && beforeIcon && (
          <Spacing mr={1}>
            <Flex>
              {React.cloneElement(beforeIcon, {
                ...iconProps,
                size: beforeIcon.props?.size || iconProps.size,
              })}
            </Flex>
          </Spacing>
        )}
        {loading && <Spinner />}
        {!loading && (
          <Flex>
            {children}
          </Flex>
        )}
        {!loading && afterIcon && (
          <Spacing ml={1}>
            <Flex>
              {React.cloneElement(afterIcon, {
                ...iconProps,
                size: afterIcon.props?.size || iconProps.size,
              })}
            </Flex>
          </Spacing>
        )}
      </FlexContainer>
    </ButtonStyle>
  );
};

export default React.forwardRef(Button);
