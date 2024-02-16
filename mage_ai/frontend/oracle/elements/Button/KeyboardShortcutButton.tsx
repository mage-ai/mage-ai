import React, { useContext, useMemo } from 'react';
import NextLink from 'next/link';
import styled, { css } from 'styled-components';

import Flex from '@oracle/components/Flex';
import KeyboardTextGroup, { NumberOrString } from '@oracle/elements/KeyboardTextGroup';
import KeyboardShortcutWrapper, {
  KeyboardShortcutSharedProps,
} from './KeyboardShortcutWrapper';
import ModelThemeContext from '@context/ModelTheme';
import Spinner from '@oracle/components/Spinner';
import dark from '@oracle/styles/themes/dark';
import { BLUE_GRADIENT } from '@oracle/styles/colors/main';
import {
  BORDER_RADIUS,
  BORDER_STYLE,
  BORDER_WIDTH,
  OUTLINE_OFFSET,
  OUTLINE_WIDTH,
} from '@oracle/styles/units/borders';
import { ButtonHighlightProps, SHARED_HIGHLIGHT_STYLES } from '.';
import {
  FONT_FAMILY_BOLD,
  FONT_FAMILY_REGULAR,
} from '@oracle/styles/fonts/primary';
import {
  LARGE,
  LARGE_LG,
  REGULAR,
  SMALL,
} from '@oracle/styles/fonts/sizes';
import { LinkProps } from '@oracle/elements/Link';
import { SHARED_LINK_STYLES } from '@oracle/elements/Link';
import { UNIT } from '@oracle/styles/units/spacing';
import { logEventCustom } from '@interfaces/EventPropertiesType';
import { transition } from '@oracle/styles/mixins';

export enum KeyTextsPostitionEnum {
  LEFT = 'left',
  RIGHT = 'right',
}

export enum ButtonTypeEnum {
  BUTTON = 'button',
  SUBMIT = 'submit',
}

export type KeyboardShortcutButtonProps = {
  Icon?: any;
  addPlusSignBetweenKeys?: boolean;
  afterElement?: any;
  beforeElement?: any;
  background?: string;
  backgroundColor?: string;
  blackBorder?: boolean;
  bold?: boolean;
  borderRadiusLeft?: boolean;
  borderRadiusRight?: boolean;
  borderless?: boolean;
  center?: boolean;
  centerText?: boolean;
  children?: any;
  compact?: boolean;
  default?: boolean;
  earth?: boolean;
  fitContentWidth?: boolean;
  fire?: boolean;
  grey300?: boolean;
  greyBorder?: boolean;
  halfPaddingBottom?: boolean;
  halfPaddingLeft?: boolean;
  halfPaddingRight?: boolean;
  halfPaddingTop?: boolean;
  inline?: boolean;
  inverted?: boolean;
  keyTextGroups?: NumberOrString[][];
  keyTextsPosition?: KeyTextsPostitionEnum;
  large1?: boolean;
  large2?: boolean;
  loading?: boolean;
  marketing?: boolean;
  muted?: boolean;
  mutedDisabled?: boolean;
  noBackground?: boolean;
  noPadding?: boolean;
  noHover?: boolean;
  outline?: boolean;
  padding?: number;
  paddingBottom?: number;
  paddingTop?: number;
  pill?: boolean;
  primary?: boolean;
  primaryGradient?: boolean;
  secondary?: boolean;
  selected?: boolean;
  shadow?: boolean;
  small?: boolean;
  smallIcon?: boolean;
  spacious?: boolean;
  shortWidth?: boolean;
  type?: ButtonTypeEnum;
  warning?: boolean;
  water?: boolean;
  wind?: boolean;
  withIcon?: boolean;
  wrapText?: boolean;
  useModelTheme?: boolean;
} & ButtonHighlightProps & KeyboardShortcutSharedProps & LinkProps;

const SHARED_STYLES = css<KeyboardShortcutButtonProps>`
  ${transition()}
  ${SHARED_HIGHLIGHT_STYLES}

  align-items: center;
  border: none;
  display: flex;
  flex-direction: row;
  position: relative;
  text-align: left;
  z-index: 0;

  ${props => !props.large1 && !props.large2 && `
    ${REGULAR}
  `}

  ${props => props.small && `
    ${SMALL}
  `}

  ${props => props.large1 && `
    ${LARGE}
  `}

  ${props => props.large2 && `
    ${LARGE_LG}
  `}

  ${props => !props.inline && `
    width: 100%;
  `}

  ${props => props.shortWidth && `
    min-width: ${UNIT * 28}px;
  `}

  ${props => !props.wrapText && `
    white-space: nowrap;
  `}

  ${props => props.outline && !props.disabled && `
    &:hover {
      box-shadow:
        0 0 0 ${OUTLINE_OFFSET}px ${(props.theme || dark).background.panel},
        0 0 0 ${OUTLINE_OFFSET + OUTLINE_WIDTH}px ${(props.theme.interactive || dark.interactive).hoverOverlay};
    }

    &:focus {
      box-shadow:
        0 0 0 ${OUTLINE_OFFSET}px ${(props.theme || dark).background.panel},
        0 0 0 ${OUTLINE_OFFSET + OUTLINE_WIDTH}px ${(props.theme.interactive || dark.interactive).focusBorder};
    }

    &:active {
      box-shadow: none;
    }
  `}

  ${props => !props.secondary && `
    font-family: ${FONT_FAMILY_REGULAR};
    justify-content: space-between;
  `}

  ${props => props.primary && !props.disabled && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    border-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    color: ${(props.theme.monotone || dark.monotone).white};

    &:hover,
    &:focus,
    &:active {
      background-color: ${(props.theme.interactive || dark.interactive).linkPrimaryHover} !important;
      border-color: ${(props.theme.interactive || dark.interactive).linkPrimary} !important;
    }
  `}

  ${props => props.center && `
    justify-content: center;
  `}

  ${props => !props.noPadding && !props.spacious && !props.compact && `
    padding: ${UNIT * 1.25}px ${UNIT * 1.5}px;
  `}

  ${props => props.compact && `
    padding: ${UNIT * 0.75}px ${UNIT * 1}px;
  `}

  ${props => props.withIcon && `
    padding: ${(UNIT * 1.25) - 1}px;
  `}

  ${props => !props.noPadding && !props.spacious && props.paddingTop && `
    padding-top: ${props.paddingTop}px;
  `}

  ${props => !props.noPadding && !props.spacious && props.halfPaddingTop && `
    padding-top: ${UNIT * 0.625}px;
  `}

  ${props => !props.noPadding && !props.spacious && props.halfPaddingBottom && `
    padding-bottom: ${UNIT * 0.625}px;
  `}

  ${props => !props.noPadding && !props.spacious && props.paddingBottom && `
    padding-bottom: ${props.paddingBottom}px;
  `}

  ${props => !props.noPadding && !props.spacious && props.halfPaddingRight && `
    padding-right: ${UNIT * 0.75}px;
  `}

  ${props => !props.noPadding && !props.spacious && props.halfPaddingLeft && `
    padding-left: ${UNIT * 0.75}px;
  `}

  ${props => !props.noPadding && props.spacious && !props.marketing && `
    padding: ${UNIT * 2.25}px ${UNIT * 3}px;
  `}

  ${props => !props.noPadding && props.spacious && props.marketing && `
    padding: ${(UNIT * 2.25) - 2}px ${(UNIT * 3) - 2}px;
  `}

  ${props => !props.noPadding && props.spacious && props.halfPaddingTop && `
    padding-top: ${UNIT * 1.125}px;
  `}

  ${props => !props.noPadding && props.spacious && props.halfPaddingBottom && `
    padding-bottom: ${UNIT * 1.125}px;
  `}

  ${props => !props.noPadding && props.spacious && props.halfPaddingRight && `
    padding-right: ${UNIT * 1.5}px;
  `}

  ${props => !props.noPadding && props.spacious && props.halfPaddingLeft && `
    padding-left: ${UNIT * 1.5}px;
  `}

  ${props => props.secondary && `
    flex-basis: content;
    font-family: ${FONT_FAMILY_BOLD};
    padding: 0;
  `}

  ${props => props.noPadding && `
    padding: 0;
  `}

  ${props => props.bold && `
    font-family: ${FONT_FAMILY_BOLD};
  `}

  ${props => !props.muted && !props.inverted && `
    color: ${(props.theme.content || dark.content).active};
  `}

  ${props => !props.muted && props.inverted && `
    color: ${(props.theme.content || dark.content).inverted};
  `}

  ${props => props.muted && `
    color: ${(props.theme.monotone || dark.monotone).grey300};
  `}

  ${props => props.default && `
    color: ${(props.theme.content || dark.content).default};
  `}

  ${props => props.warning && `
    color: ${(props.theme.brand || dark.brand).energy400};
  `}

  ${props => props.noHover && `
    &:hover {
      cursor: default;
    }
  `}

  ${props => props.greyBorder && `
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.button};
  `}

  ${props => props.blackBorder && `
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme.monotone || dark.monotone).black};
  `}

  ${props => !props.pill && !props.borderless && !props.compact && `
    border-radius: ${BORDER_RADIUS}px;
  `}

  ${props => props.compact && `
    border-radius: ${BORDER_RADIUS}px;
  `}

  ${props => !props.borderRadiusLeft && !props.borderRadiusRight && props.pill && !props.spacious && `
    border-radius: ${UNIT * 5}px;
  `}

  ${props => props.borderRadiusLeft && props.pill && !props.spacious && `
    border-bottom-left-radius: ${UNIT * 5}px;
    border-top-left-radius: ${UNIT * 5}px;
  `}

  ${props => props.borderRadiusRight && props.pill && !props.spacious && `
    border-bottom-right-radius: ${UNIT * 5}px;
    border-top-right-radius: ${UNIT * 5}px;
  `}

  ${props => props.borderRadiusLeft && props.pill && props.spacious && `
    border-bottom-left-radius: ${UNIT * 8}px;
    border-top-left-radius: ${UNIT * 8}px;
  `}

  ${props => props.borderRadiusRight && props.pill && props.spacious && `
    border-bottom-right-radius: ${UNIT * 8}px;
    border-top-right-radius: ${UNIT * 8}px;
  `}

  ${props => props.inverted && !props.noBackground && !props.backgroundColor && `
    background-color: ${(props.theme.monotone || dark.monotone).black};
  `}

  ${props => !props.inverted && !props.noBackground && !props.primary && !props.noHover && `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};

    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    }
  `}

  ${props => !props.inverted && !props.noBackground && !props.primary && props.noHover && `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
  `}

  ${props => !props.noBackground && props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}

  ${props => props.noBackground && `
    background-color: transparent !important;
  `}

  ${props => props.disabled && props.inverted && `
    color: ${(props.theme.monotone || dark.monotone).grey400} !important;
  `}

  ${props => props.disabled && !props.inverted && `
    color: ${(props.theme.monotone || dark.monotone).grey300} !important;
  `}

  ${props => props.disabled && `
    &:hover {
      cursor: not-allowed;
    }
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.monotone || dark.monotone).black};
    color: ${(props.theme.monotone || dark.monotone).white};
  `}

  ${props => props.selected && props.grey300 && `
    background-color: ${(props.theme.monotone || dark.monotone).grey300};
  `}

  ${props => (props.selected || props.useModelTheme) && props.fire && `
    background-color: ${(props.theme.brand || dark.brand).fire400};
  `}

  ${props => props.useModelTheme && `
    color: ${(props.theme.monotone || dark.monotone).white};
  `}

  ${props => (props.selected || props.useModelTheme) && props.earth && `
    background-color: ${(props.theme.brand || dark.brand).earth400};
  `}

  ${props => props.primaryGradient && `
    background: ${BLUE_GRADIENT} !important;
  `}

  ${props => props.background && `
    background: ${props.background} !important;
  `}

  ${props => (props.selected || props.useModelTheme) && props.wind && `
    background-color: ${(props.theme.brand || dark.brand).wind400};

    &:hover,
    &:focus,
    &:active {
      background-color: ${(props.theme.brand || dark.brand).wind500};
    }
  `}

  ${props => (props.selected || props.useModelTheme) && props.water && `
    background-color: ${(props.theme.brand || dark.brand).water400};
  `}

  ${props => props.padding > 0 && `
    padding: ${props.padding}px;
  `}

  ${props => props.shadow && `
    box-shadow: ${(props.theme.shadow || dark.shadow).large};
  `}
`;

const ButtonStyle = styled.button<KeyboardShortcutButtonProps>`
  ${SHARED_STYLES}
`;

const AnchorStyle = styled.a<KeyboardShortcutButtonProps>`
  ${SHARED_STYLES}
  ${SHARED_LINK_STYLES}
`;

function KeyboardShortcutButton({
  Icon,
  addPlusSignBetweenKeys,
  afterElement,
  beforeElement,
  bold,
  borderless,
  centerText,
  children,
  compact,
  disabled,
  fitContentWidth,
  inverted,
  keyTextGroups,
  keyTextsPosition = KeyTextsPostitionEnum.RIGHT,
  linkProps,
  loading,
  mutedDisabled,
  noHover,
  onClick: onClickProp,
  padding,
  smallIcon,
  type = ButtonTypeEnum.BUTTON,
  useModelTheme,
  ...props
}: KeyboardShortcutButtonProps, ref) {
  const {
    as: asHref,
    href: linkHref,
  } = linkProps || {};
  const ElToUse = (asHref || linkHref) ? AnchorStyle : ButtonStyle;

  const keyTextsRender = useMemo(() => {
    if (!keyTextGroups) return null;

    return (
      <div
        style={{
          ...(keyTextsPosition === KeyTextsPostitionEnum.RIGHT ? {
            marginLeft: 4,
          } : {
            marginRight: 4,
          }),
        }}
      >
        <KeyboardTextGroup
          addPlusSignBetweenKeys={addPlusSignBetweenKeys}
          borderless={inverted}
          disabled={disabled}
          keyTextGroups={keyTextGroups}
          mutedDisabled={mutedDisabled}
        />
      </div>
    );
  }, [
    addPlusSignBetweenKeys,
    disabled,
    inverted,
    keyTextGroups,
    keyTextsPosition,
    mutedDisabled,
  ]);

  const {
    sharedProps,
  } = useContext(ModelThemeContext) || {};

  return (
    <KeyboardShortcutWrapper
      {...props}
      buildChildren={({
        eventParameters,
        eventName,
        onClick,
      }) => {
        const El = (
          // @ts-ignore
          <ElToUse
            {...props}
            {...(useModelTheme ? sharedProps : {})}
            bold={useModelTheme || bold}
            borderless={useModelTheme || borderless}
            center={centerText}
            compact={compact}
            disabled={disabled || mutedDisabled}
            fitContentWidth={fitContentWidth}
            inverted={inverted}
            noHover={(!onClick || noHover) && !(asHref || linkHref) && type === ButtonTypeEnum.BUTTON}
            onClick={(event) => {
              const updatedEventParameters = {
                ...eventParameters,
              };
              if (typeof children === 'string') {
                updatedEventParameters.label = children;
              }
              logEventCustom(eventName, updatedEventParameters);
              onClick?.(event);
            }}
            padding={(smallIcon && !children)
              ? 11    // 11px padding to match size of button with text
              : padding
            }
            ref={ref}
            type={(asHref || linkHref) ? null : type}
            useModelTheme={useModelTheme}
            withIcon={!!Icon}
          >
            {beforeElement && !loading && (
              <>
                {beforeElement}
                <div style={{ marginRight: 4 }} />
              </>
            )}

            {keyTextsPosition === KeyTextsPostitionEnum.LEFT && keyTextsRender}

            <Flex alignItems="center">
              {Icon && (
                <Icon
                  muted={disabled || mutedDisabled}
                  size={smallIcon ? (UNIT * 2) : (UNIT * 2.5)}
                />
              )}

              {Icon && children && <div style={{ marginRight: 4 }} />}

              {loading && (
                <Spinner
                  inverted={!inverted}
                  small={smallIcon}
                />
              )}
              {!loading && children}
            </Flex>

            {keyTextsPosition === KeyTextsPostitionEnum.RIGHT && keyTextsRender && (
              <div style={{ marginLeft: 4 }}>
                {keyTextsRender}
              </div>
            )}

            {afterElement && !loading && (
              <>
                <div style={{ marginLeft: afterElement ? 4 : 0 }} />
                {afterElement}
              </>
            )}
          </ElToUse>
        );

        if ((asHref || linkHref) && !disabled && !mutedDisabled) {
          return (
            <NextLink
              {...linkProps}
              passHref
            >
              {El}
            </NextLink>
          );
        }

        return El;
      }}
      disabled={disabled || mutedDisabled}
      linkProps={linkProps}
      onClick={onClickProp}
      ref={ref}
    />
  );
}

export default React.forwardRef(KeyboardShortcutButton);
