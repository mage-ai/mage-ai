import React from 'react';
import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import {
  BORDER_STYLE,
  BORDER_WIDTH,
  BORDER_RADIUS_SMALL,
  OUTLINE_OFFSET,
} from '@oracle/styles/units/borders';
import { SHARED_TEXT_STYLES } from '@oracle/elements/Text';
import { transition } from '@oracle/styles/mixins';

export type LinkProps = {
  autoHeight?: boolean;
  block?: boolean;
  bold?: boolean;
  centerAlign?: boolean;
  children?: any;
  color?: string;
  danger?: boolean;
  default?: boolean;
  disabled?: boolean;
  flex?: number;
  fitContentHeight?: boolean;
  fitContentWidth?: boolean;
  fullHeight?: boolean;
  fullWidth?: boolean;
  height?: number;
  href?: string;
  inline?: boolean;
  large?: boolean;
  minWidth?: number;
  monospace?: boolean;
  muted?: boolean;
  noColor?: boolean;
  noHoverUnderline?: boolean;
  noOutline?: boolean;
  noWrapping?: boolean;
  onClick?: (event: any) => void;
  onDoubleClick?: (event: any) => void;
  onFocus?: (event: any) => void;
  openNewWindow?: boolean;
  overflow?: string;
  pointerEventsEnabled?: boolean;
  preventDefault?: boolean;
  primary?: boolean;
  sameColorAsText?: boolean;
  secondary?: boolean;
  selected?: boolean;
  small?: boolean;
  tabIndex?: number;
  target?: string;
  textOverflow?: string;
  title?: string;
  transparentBorder?: boolean;
  underline?: boolean;
  verticalAlignContent?: boolean;
  warning?: boolean;
  weightStyle?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  wordWrap?: boolean;
  xsmall?: boolean;
};

export const SHARED_LINK_STYLES = css<any>`
  ${transition()}
  outline: none;
  text-decoration: none;

  &:focus {
    outline: none;
  }

  ${(props) =>
    !props.danger &&
    !props.noColor &&
    !props.sameColorAsText &&
    !props.secondary &&
    !props.color &&
    `
    color: ${(props.theme.interactive || dark.interactive).linkPrimary};
  `}

  ${(props) => props.color && `
    color: ${props.color};
  `}

  ${props => props.pointerEventsEnabled && `
    pointer-events: all;
  `}

  ${props => props.wordWrap && `
    overflow-wrap: anywhere;
    word-break: break-word;
  `}

  ${props => props.fitContentWidth && `
    width: fit-content;
  `}

  ${props => props.inline && `
    display: inline-flex;
  `}
  ${props => props.centerAlign && `
    text-align: center;
  `}

  ${props => props.primary && `
    color: ${(props.theme.interactive || dark.interactive).linkPrimaryLight};
    &:hover {
      color: ${(props.theme.interactive || dark.interactive).linkPrimaryLight};
    }
  `}

  ${props => props.secondary && `
    color: ${(props.theme.interactive || dark.interactive).linkSecondary};
    &:hover {
      color: ${(props.theme.interactive || dark.interactive).linkSecondary};
    }
  `}

  ${props => props.warning && `
    color: ${(props.theme || dark).accent.yellow};
  `}

  ${props => props.danger && `
    color: ${(props.theme.interactive || dark.interactive).dangerBorder} !important;

    &:active,
    &:focus,
    &:hover {
      color: ${(props.theme.interactive || dark.interactive).dangerBorder} !important;
    }
  `}

  ${props => props.selected && `
    background: ${(props.theme.interactive || dark.monotone.black)};
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme.monotone || dark.monotone).focusBorder};
  `}

  ${props => props.transparentBorder && `
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} transparent;
  `}

  ${props => props.autoHeight && `
    line-height: inherit !important;
  `}

  ${props => props.fitContentHeight && `
    height: fit-content;
  `}

  ${props => !props.noHoverUnderline && !props.disabled && `
    &:hover {
      text-decoration: underline;
    }
  `}

  &:hover,
  &:focus {
    outline: none;
  }

  ${props => !props.disabled && !props.noOutline && !props.selected && `
    &:focus {
      box-shadow: 0 0 0 ${OUTLINE_OFFSET}px ${(props.theme.interactive || dark.interactive).focusBorder};
    }
  `}

  ${props => props.block && `
    display: block;
  `}

  ${props => props.sameColorAsText && !props.disabled && `
    color: ${(props.theme.content || dark.content).active};

    &:hover {
      color: ${(props.theme.content || dark.content).active};
    }
  `}

  ${props => props.muted && !props.disabled && `
    color: ${(props.theme.content || dark.content).disabled};

    &:hover,
    &:focus {
      color: ${(props.theme.content || dark.content).disabled};
    }
  `}

  ${props => props.disabled && `
    color: ${(props.theme.content || dark.content).disabled};
    cursor: not-allowed;

    &:focus,
    &:hover {
      color: ${(props.theme.content || dark.content).disabled};
    }
  `}

  ${props => props.disabled && `
    color: ${(props.theme.monotone || dark.monotone).gray};
    cursor: not-allowed;

    &:focus,
    &:hover {
      color: ${(props.theme.monotone || dark.monotone).gray};
    }
  `}

  ${props => props.default && !props.disabled && `
    color: ${(props.theme.monotone || dark.monotone).gray};

    &:hover {
      color: ${(props.theme.monotone || dark.monotone).gray};
    }
  `}

  ${props => props.overflow && `
    overflow: ${props.overflow};
  `}

  ${props => props.textOverflow && `
    overflow: hidden;
    text-overflow: ${props.textOverflow};
  `}

  ${props => props.fullHeight && `
    height: 100%;
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}

  ${props => props.underline && `
    text-decoration: underline;
  `}

  ${props => props.flex && `
    flex: ${props.flex};
  `}

  ${props => typeof props.height !== 'undefined' && `
    height: ${props.height}px;
  `}

  ${props => props.verticalAlignContent && `
    align-items: center;
    display: flex;
  `}

  ${props => props.noWrapping && `
    white-space: nowrap;
  `}
`;

const LinkStyle = styled.a`
  ${SHARED_LINK_STYLES}
  ${SHARED_TEXT_STYLES}

  border-radius: ${BORDER_RADIUS_SMALL}px;
  position: relative;
  z-index: 1;
`;

const Link = ({
  children,
  disabled,
  href = '#',
  onClick,
  onDoubleClick,
  onFocus,
  openNewWindow,
  preventDefault,
  sameColorAsText,
  selected,
  target,
  transparentBorder,
  weightStyle = 3,
  ...props
}: {
  children: any;
} & LinkProps, ref) => (
  <LinkStyle
    {...props}
    {...({})}
    disabled={disabled}
    href={href}
    onClick={(e) => {
      if (disabled || preventDefault) {
        e.preventDefault();
      }
      if (onClick && !disabled) {
        onClick(e);
      }
    }}
    onDoubleClick={(e) => {
      if (disabled || preventDefault) {
        e.preventDefault();
      }
      if (onDoubleClick && !disabled) {
        onDoubleClick(e);
      }
    }}
    onFocus={e => onFocus?.(e)}
    preventDefault={preventDefault}
    ref={ref}
    rel={openNewWindow ? 'noopener noreferrer' : null}
    sameColorAsText={sameColorAsText}
    selected={selected}
    target={target || (openNewWindow ? '_blank' : null)}
    transparentBorder={transparentBorder}
    weightStyle={weightStyle}
  >
    {children}
  </LinkStyle>
);

export default React.forwardRef(Link);
