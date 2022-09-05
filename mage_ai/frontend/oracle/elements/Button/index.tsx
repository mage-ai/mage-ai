import React from 'react';
import NextLink from 'next/link';
import styled, { css } from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import dark from '@oracle/styles/themes/dark';
import light from '@oracle/styles/themes/light';
import { BLUE_GRADIENT, PURPLE_PINK_GRADIENT } from '@oracle/styles/colors/main';
import {
  BORDER_RADIUS,
  BORDER_RADIUS_SMALL,
  BORDER_STYLE,
  OUTLINE_OFFSET,
  OUTLINE_WIDTH,
} from '@oracle/styles/units/borders';
import { FONT_FAMILY_BOLD } from '@oracle/styles/fonts/primary';
import { LARGE, REGULAR, SMALL } from '@oracle/styles/fonts/sizes';
import { SHARED_LINK_STYLES } from '@oracle/elements/Link';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export function selectOutlineColor(props) {
  if (props.outlineBackgroundColorSelector) {
    return props.outlineBackgroundColorSelector(props.theme || dark);
  }

  return (props.theme.background || dark.background).panel;
}

export type ButtonProps = {
  afterIcon?: any;
  backgroundColor?: string;
  backgroundGradient?: string;
  basic?: boolean;
  beforeIcon?: any;
  borderColor?: string;
  borderLess?: boolean;
  borderRadiusLeft?: boolean;
  borderRadiusRight?: boolean;
  children?: any;
  danger?: boolean;
  default?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  highlightOnHover?: boolean;
  iconOnly?: boolean;
  id?: string;
  large?: boolean;
  linkProps?: {
    as?: string;
    href: string;
  };
  loading?: boolean;
  minWidth?: number;
  noBackground?: boolean;
  noBorder?: boolean;
  noBorderRight?: boolean;
  noHoverUnderline?: boolean;
  noPadding?: boolean;
  notClickable?: boolean;
  outline?: boolean;
  onClick?: (e?: Event | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  padding?: string;
  pointerEventsEnabled?: boolean;
  primary?: boolean;
  primaryGradient?: boolean;
  sameColorAsText?: boolean;
  secondaryGradient?: boolean;
  selected?: boolean;
  selectedAlt?: boolean;
  small?: boolean;
  smallBorderRadius?: boolean;
  success?: boolean;
  target?: string;
  title?: string;
  transparent?: boolean;
  width?: number;
};

const SHARED_STYLES = css<{
  hasOnClick?: boolean;
} & ButtonProps>`
  ${transition()}

  border: none;
  display: block;
  font-family: ${FONT_FAMILY_BOLD};
  padding: ${1 * UNIT}px ${1.5 * UNIT}px;
  position: relative;
  z-index: 0;

  ${props => !props.hasOnClick && `
    &:hover {
      cursor: default;
    }
  `}

  ${props => `
    border-color: ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}

  ${props => !props.default && `
    color: ${(props.theme.content || dark.content).active};
  `}

  ${props => props.default && `
    color: ${(props.theme.content || dark.content).default};
  `}

  ${props => props.borderColor && `
    border-color: ${props.borderColor};
  `}

  ${props => !props.noBackground && `
    background-color: ${(props.theme.background || dark.background).row};
  `}

  ${props => props.pointerEventsEnabled && `
    pointer-events: all;
  `}

  ${props => props.backgroundGradient && `
    background: ${props.backgroundGradient};
  `}

  ${props => props.noBackground && `
    background-color: transparent;
  `}

  ${props => props.padding && `
    padding: ${props.padding} !important;
  `}

  ${props => props.noPadding && `
    padding: 0;
  `}

  ${props => props.notClickable && `
    &:hover,
    &:focus {
      cursor: default;
    }
  `}

  ${props => !props.basic && `
    border-style: ${BORDER_STYLE};
    border-width: 1px;
  `}

  ${props => !props.borderRadiusLeft && !props.borderRadiusRight && !props.noBorder && `
    border-radius: ${BORDER_RADIUS}px;
  `}

  ${props => (props.noBorder || props.borderLess) && `
    border: none;
  `}

  ${props => props.smallBorderRadius && `
    border-radius: ${BORDER_RADIUS_SMALL}px;
  `}

  ${props => !props.borderRadiusLeft && props.borderRadiusRight && `
    border-radius: 0px ${BORDER_RADIUS}px ${BORDER_RADIUS}px 0px;
  `}

  ${props => props.borderRadiusLeft && !props.borderRadiusRight && `
    border-radius: ${BORDER_RADIUS}px 0px 0px ${BORDER_RADIUS}px;
  `}

  ${props => props.noBorderRight && `
    border-right: none;
  `}

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}

  ${props => props.danger && `
    background-color: ${(props.theme.background || dark.background).danger};
  `}

  ${props => props.success && `
    background-color: ${(props.theme.background || dark.background).success};
  `}

  ${props => !props.iconOnly && props.large && `
    ${LARGE}
  `}

  ${props => !props.iconOnly && !props.large && !props.small && `
    ${REGULAR}
  `}

  ${props => !props.iconOnly && props.small && `
    ${SMALL}
  `}

  ${props => !props.noPadding && props.iconOnly && `
    padding: ${UNIT}px;
  `}

  ${props => props.transparent && `
    background-color: transparent;
  `}

  ${props => props.highlightOnHover && `
    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBorder};
    }
  `}

  ${props => props.outline && !props.disabled && !props.notClickable && `
    &:hover {
      box-shadow:
        0 0 0 ${OUTLINE_OFFSET}px ${selectOutlineColor(props)},
        0 0 0 ${OUTLINE_OFFSET + OUTLINE_WIDTH}px ${(props.theme.interactive || dark.interactive).hoverOverlay};
    }

    &:focus {
      box-shadow:
        0 0 0 ${OUTLINE_OFFSET}px ${selectOutlineColor(props)},
        0 0 0 ${OUTLINE_OFFSET + OUTLINE_WIDTH}px ${(props.theme.interactive || dark.interactive).focusBorder};
    }

    &:active {
      box-shadow: none;
    }
  `}

  ${props => !props.disabled && !props.notClickable && !props.outline && `
    &:hover {
      border-color: ${(props.theme.interactive || dark.interactive).hoverBorder};
    }
    &:active {
      border-color: ${(props.theme.content || dark.content).active};
    }
  `}

  ${props => props.primary && !props.disabled && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    border-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    color: ${(props.theme.monotone || dark.monotone).white};

    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).linkPrimaryHover};
      border-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    }
  `}

  ${props => props.secondaryGradient && `
    background: ${PURPLE_PINK_GRADIENT};
  `}

  ${props => props.primaryGradient && `
    background: ${BLUE_GRADIENT};
  `}

  ${props => props.disabled && `
    color: ${(props.theme.interactive || dark.interactive).disabledBorder};
    &:hover {
      cursor: not-allowed;
    }
  `}

  ${props => props.selected && `
    border-color: ${(props.theme.content || dark.content).active};
  `}

  ${props => props.selectedAlt && `
    border: ${OUTLINE_WIDTH}px ${BORDER_STYLE} ${(props.theme.monotone || dark.monotone).white};
    box-shadow: 0 0 0 0.5px ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => props.minWidth && `
    min-width: ${props.minWidth}px;
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}
`;

const ButtonStyle = styled.button`
  ${SHARED_STYLES};
`;

const AnchorStyle = styled.a`
  ${SHARED_STYLES};
  ${SHARED_LINK_STYLES}
`;

const Button = ({
  afterIcon,
  beforeIcon,
  children,
  disabled,
  iconOnly,
  id,
  linkProps,
  loading,
  onClick,
  ...props
}: ButtonProps, ref) => {
  const iconProps = {
    disabled,
    size: UNIT * 1.5,
  };

  const {
    as: asHref,
    href: linkHref,
  } = linkProps || {};
  const ElToUse = (asHref || linkHref) ? AnchorStyle : ButtonStyle;

  const el = (
    <ElToUse
      {...props}
      disabled={disabled}
      hasOnClick={!!onClick || asHref || linkHref}
      iconOnly={iconOnly}
      id={id}
      onClick={onClick
        ? (e) => {
          e?.preventDefault();
          onClick?.(e);
        }
        : null
      }
      ref={ref}
    >
      <FlexContainer
        alignItems="center"
        justifyContent="center"
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
            {!iconOnly && children}
            {iconOnly && React.cloneElement(children, {
              ...iconProps,
              size: children.props?.size || iconProps.size,
            })}
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
    </ElToUse>
  );

  if (asHref || linkHref) {
    return (
      <NextLink
        {...linkProps}
        passHref
      >
        {el}
      </NextLink>
    );
  }

  return el;
};

export default React.forwardRef(Button);
