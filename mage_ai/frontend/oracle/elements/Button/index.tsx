import React from 'react';
import NextLink from 'next/link';
import styled, { css } from 'styled-components';
import { useRouter } from 'next/router';

import EventPropertiesType, {
  buildEventData,
  EVENT_ACTION_TYPE_CLICK,
  EVENT_COMPONENT_TYPE_BUTTON,
  getDefaultEventParameters,
  logEventCustom,
} from '@interfaces/EventPropertiesType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import dark from '@oracle/styles/themes/dark';
import { BLUE_GRADIENT, PURPLE_PINK_GRADIENT } from '@oracle/styles/colors/main';
import {
  BORDER_RADIUS,
  BORDER_STYLE,
  OUTLINE_OFFSET,
  OUTLINE_WIDTH,
} from '@oracle/styles/units/borders';
import { FONT_FAMILY_BOLD, FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
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

export type ButtonHighlightProps = {
  highlightOnHover?: boolean;
  highlightOnHoverAlt?: boolean;
};

export type ButtonProps = {
  afterIcon?: any;
  backgroundColor?: string;
  backgroundGradient?: string;
  basic?: boolean;
  beforeIcon?: any;
  borderColor?: string;
  borderLess?: boolean;
  borderRadius?: string;
  borderRadiusLeft?: boolean;
  borderRadiusRight?: boolean;
  children?: any;
  compact?: boolean;
  danger?: boolean;
  default?: boolean;
  disabled?: boolean;
  eventProperties?: EventPropertiesType;
  fullWidth?: boolean;
  iconOnly?: boolean;
  id?: string;
  inline?: boolean;
  large?: boolean;
  linkProps?: {
    as?: string;
    href: string;
  };
  loading?: boolean;
  minWidth?: number;
  noBackground?: boolean;
  noBold?: boolean;
  noBorder?: boolean;
  noBorderRight?: boolean;
  noHover?: boolean;
  noHoverUnderline?: boolean;
  noPadding?: boolean;
  notClickable?: boolean;
  outline?: boolean;
  onClick?: (e?: Event | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onMouseEnter?: (e?: Event | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  padding?: string;
  pill?: boolean;
  pointerEventsEnabled?: boolean;
  primary?: boolean;
  primaryAlternate?: boolean;
  primaryGradient?: boolean;
  sameColorAsText?: boolean;
  secondary?: boolean;
  secondaryGradient?: boolean;
  selected?: boolean;
  selectedAlt?: boolean;
  small?: boolean;
  style?: {
    position?: string;
    right?: number;
    top?: number;
    zIndex?: number;
  };
  success?: boolean;
  tabIndex?: number;
  target?: string;
  title?: string;
  transparent?: boolean;
  warning?: boolean;
  width?: number;
} & ButtonHighlightProps;

export const SHARED_HIGHLIGHT_STYLES = css<ButtonHighlightProps>`
  ${props => props.highlightOnHover && `
    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBorder} !important;
    }
  `}

  ${props => props.highlightOnHoverAlt && `
    &:hover {
      background-color: ${(props.theme || dark).borders?.medium2} !important;
    }
  `}
`;

const SHARED_STYLES = css<{
  hasOnClick?: boolean;
} & ButtonProps>`
  ${transition()}
  ${SHARED_HIGHLIGHT_STYLES}

  border: none;
  display: block;
  padding: ${1 * UNIT}px ${1.5 * UNIT}px;
  position: relative;
  z-index: 0;

  ${props => !props.noBold && `
    font-family: ${FONT_FAMILY_BOLD};
  `}

  ${props => props.noBold && `
    font-family: ${FONT_FAMILY_REGULAR};
  `}

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

  ${props => !props.noPadding && props.compact && `
    padding: ${UNIT / 2}px ${UNIT}px;
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

  ${props => !props.borderRadiusLeft && !props.borderRadiusRight && `
    border-radius: ${BORDER_RADIUS}px;
  `}

  ${props => props.pill && `
    border-radius: ${UNIT * 3}px;
  `}

  ${props => (props.noBorder || props.borderLess) && `
    border: none;
  `}

  ${props => props.borderRadius && `
    border-radius: ${props.borderRadius} !important;
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
    background-color: ${(props.theme.accent || dark.accent).negative};
  `}

  ${props => props.success && `
    background-color: ${(props.theme.background || dark.background).success};
    color: ${(props.theme.content || dark.content).inverted};
  `}

  ${props => props.warning && `
    background-color: ${(props.theme.accent || dark.accent).warning};
    color: ${(props.theme.content || dark.content).inverted};
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
    &:hover,
    &:focus {
      border-color: ${(props.theme.interactive || dark.interactive).hoverBorder};
    }
    &:active {
      border-color: ${(props.theme.content || dark.content).active};
    }
  `}

  ${props => props.secondary && !props.disabled && `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
    border-color: ${(props.theme || dark).borders.dark};
  `}

  ${props => props.primary && !props.disabled && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    border-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    color: ${(props.theme.monotone || dark.monotone).white};
  `}

  ${props => props.primary && !props.disabled && !props.notClickable && `
    &:hover,
    &:focus,
    &:active {
      background-color: ${(props.theme.interactive || dark.interactive).linkPrimaryHover} !important;
      border-color: ${(props.theme.interactive || dark.interactive).linkPrimary} !important;
    }
  `}

  ${props => props.primaryAlternate && `
    background-color: ${(props.theme.brand || dark.brand).wind400};
  `}

  ${props => props.borderColor && `
    border-color: ${props.borderColor};
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
  ${SHARED_STYLES}
`;

const AnchorStyle = styled.a`
  ${SHARED_STYLES}
  ${SHARED_LINK_STYLES}

  ${props => props.disabled && `
    pointer-events: none;
  `}
`;

const Button = ({
  afterIcon,
  beforeIcon,
  children,
  compact,
  danger,
  disabled,
  eventProperties,
  iconOnly,
  id,
  linkProps,
  loading,
  onClick,
  secondary,
  ...props
}: ButtonProps, ref) => {
  const router = useRouter();
  const query = router?.query;
  const iconProps = {
    disabled,
    size: UNIT * 1.5,
  };

  const {
    eventActionType = EVENT_ACTION_TYPE_CLICK,
    eventComponentType = EVENT_COMPONENT_TYPE_BUTTON,
    eventParameters: eventParametersProp = {},
  } = eventProperties || {};
  const defaultEventParameters = getDefaultEventParameters(eventParametersProp, query);
  const {
    eventName,
    eventParameters,
  } = buildEventData({
    actionType: eventActionType,
    componentType: eventComponentType,
    parameters: defaultEventParameters,
  });

  const {
    as: asHref,
    href: linkHref,
  } = linkProps || {};
  const ElToUse = (asHref || linkHref) ? AnchorStyle : ButtonStyle;

  const el = (
    // @ts-ignore
    <ElToUse
      {...props}
      compact={compact}
      danger={danger}
      disabled={disabled}
      hasOnClick={!!onClick || !!asHref || !!linkHref}
      iconOnly={iconOnly}
      id={id}
      onClick={onClick
        ? (e) => {
          e?.preventDefault();
          const updatedEventParameters = {
            ...eventParameters,
          };
          if (typeof children === 'string') {
            updatedEventParameters.label = children;
          }
          logEventCustom(eventName, eventParameters);
          onClick?.(e);
        }
        : null
      }
      ref={ref}
      secondary={secondary}
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
        {loading && <Spinner inverted={danger || secondary} size={compact ? 20 : 24} />}
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
