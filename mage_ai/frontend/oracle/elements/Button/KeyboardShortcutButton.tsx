import React, { useContext, useMemo } from 'react';
import NextLink from 'next/link';
import styled, { css } from 'styled-components';

import Flex from '@oracle/components/Flex';
import KeyboardTextGroup, { NumberOrString } from '@oracle/elements/KeyboardTextGroup';
import KeyboardShortcutWrapper, {
  KeyboardShortcutSharedProps,
} from './KeyboardShortcutWrapper';
import ModelThemeContext from '@context/ModelTheme';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import dark from '@oracle/styles/themes/dark';
import {
  BORDER_RADIUS,
  BORDER_RADIUS_SMALL,
  BORDER_STYLE,
  BORDER_WIDTH,
 } from '@oracle/styles/units/borders';
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
  afterElement?: any;
  beforeElement?: any;
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
  earth?: boolean;
  fitContentWidth?: boolean;
  fire?: boolean;
  grey300?: boolean;
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
  pill?: boolean;
  primaryEnergy?: boolean;
  secondary?: boolean;
  selected?: boolean;
  shadow?: boolean;
  spacious?: boolean;
  shortWidth?: boolean;
  type?: ButtonTypeEnum;
  warning?: boolean;
  water?: boolean;
  wind?: boolean;
  withIcon?: boolean;
  wrapText?: boolean;
  useModelTheme?: boolean;
} & KeyboardShortcutSharedProps;

const SHARED_STYLES = css<KeyboardShortcutButtonProps>`
  ${transition()}

  align-items: center;
  border: none;
  display: flex;
  flex-direction: row;
  position: relative;
  text-align: left;
  z-index: 0;

  ${props => !props.large1 && !props.large2 && !props.compact && `
    ${REGULAR}
  `}

  ${props => props.compact && `
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

  ${props => !props.secondary && `
    font-family: ${FONT_FAMILY_REGULAR};
    justify-content: space-between;
  `}

  ${props => props.center && `
    justify-content: center;
  `}

  ${props => !props.noPadding && !props.spacious && !props.compact && `
    padding: ${UNIT * 1.25}px ${UNIT * 1.5}px;
  `}

  ${props => props.compact && `
    padding: ${UNIT * 0.5}px ${UNIT * 0.75}px;
  `}

  ${props => !props.noPadding && !props.spacious && props.halfPaddingTop && `
    padding-top: ${UNIT * 0.625}px;
  `}

  ${props => !props.noPadding && !props.spacious && props.halfPaddingBottom && `
    padding-bottom: ${UNIT * 0.625}px;
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

  ${props => props.warning && `
    color: ${(props.theme.brand || dark.brand).energy400};
  `}

  ${props => props.noHover && `
    &:hover {
      cursor: default;
    }
  `}

  ${props => props.blackBorder && `
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme.monotone || dark.monotone).black};
  `}

  ${props => !props.pill && !props.borderless && !props.compact && `
    border-radius: ${BORDER_RADIUS}px;
  `}

  ${props => props.compact && `
    border-radius: ${BORDER_RADIUS_SMALL}px;
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

  ${props => !props.noBackground && props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}

  ${props => props.inverted && !props.noBackground && !props.backgroundColor && `
    background-color: ${(props.theme.monotone || dark.monotone).black};
  `}

  ${props => !props.inverted && !props.noBackground && `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};

    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    }
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

  ${props => props.primaryEnergy && `
    background-color: ${(props.theme.brand || dark.brand).energy400};
    border: none;
    font-family: ${FONT_FAMILY_BOLD};
  `}

  ${props => (props.selected || props.useModelTheme) && props.wind && `
    background-color: ${(props.theme.brand || dark.brand).wind400};
  `}

  ${props => (props.selected || props.useModelTheme) && props.water && `
    background-color: ${(props.theme.brand || dark.brand).water400};
  `}

  ${props => props.withIcon && `
    padding: ${(UNIT * 1.25) - 1}px !important;
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

const SpanStyle = styled.span`
  margin-right: ${UNIT * 1}px;
`;

function KeyboardShortcutButton({
  Icon,
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
  onClick: onClickProp,
  type = ButtonTypeEnum.BUTTON,
  useModelTheme,
  ...props
}: KeyboardShortcutButtonProps) {
  const {
    as: asHref,
    href: linkHref,
  } = linkProps || {};
  const ElToUse = (asHref || linkHref) ? AnchorStyle : ButtonStyle;

  const keyTextsRender = useMemo(() => {
    if (!keyTextGroups) return null;

    const spacingProps = { [keyTextsPosition === KeyTextsPostitionEnum.RIGHT ? 'ml' : 'mr']: children ? 1 : 0 };

    return (
      <Spacing {...spacingProps}>
        <KeyboardTextGroup
          borderless={inverted}
          disabled={disabled}
          keyTextGroups={keyTextGroups}
          mutedDisabled={mutedDisabled}
        />
      </Spacing>
    );
  }, [children, disabled, inverted, keyTextGroups, keyTextsPosition, mutedDisabled]);

  const {
    sharedProps,
  } = useContext(ModelThemeContext) || {};

  return (
    <KeyboardShortcutWrapper
      {...props}
      buildChildren={({
        eventProperties,
        eventType,
        logEvent,
        onClick,
        userProperties,
      }) => {
        const El = (
          // @ts-ignore
          <ElToUse
            {...props}
            {...(useModelTheme ? sharedProps : {})}
            center={centerText}
            compact={compact}
            bold={useModelTheme || bold}
            borderless={useModelTheme || borderless}
            disabled={disabled || mutedDisabled}
            fitContentWidth={fitContentWidth}
            inverted={inverted}
            noHover={!onClick && !(asHref || linkHref) && type === ButtonTypeEnum.BUTTON}
            onClick={(event) => {
              logEventCustom(logEvent, eventType, { eventProperties, userProperties });
              onClick?.(event);
            }}
            type={(asHref || linkHref) ? null : type}
            useModelTheme={useModelTheme}
            withIcon={!!Icon}
          >
            {beforeElement && !loading && (
              <>
                {beforeElement}
                <Spacing mr={1} />
              </>
            )}

            {keyTextsPosition === KeyTextsPostitionEnum.LEFT && keyTextsRender}

            <Flex alignItems="center">
              {Icon && (
                <Icon
                  inverted={!inverted}
                  muted={disabled || mutedDisabled}
                  size={UNIT * 2.5}
                />
              )}

              {Icon && children && <Spacing mr={1} />}

              {loading && (
                <SpanStyle>
                  <Spinner inverted={!inverted} />
                </SpanStyle>
              )}
              {!loading && children}
            </Flex>

            {keyTextsPosition === KeyTextsPostitionEnum.RIGHT && keyTextsRender && (
              <Spacing ml={1}>
                {keyTextsRender}
              </Spacing>
            )}

            {afterElement && !loading && (
              <>
                <Spacing ml={afterElement ? 1 : 0} />
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
    />
  );
}

export default KeyboardShortcutButton;
