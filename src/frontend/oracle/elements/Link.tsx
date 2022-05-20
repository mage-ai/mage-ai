import React from 'react';
import styled, { css } from 'styled-components';


// import {
//   ArrowRight,
//   ChevronRight,
// } from '@oracle/icons';
// import { BORDER_RADIUS } from '@oracle/styles/units/radius';
// import { BORDER_STYLE, BORDER_WIDTH, OUTLINE_WIDTH } from '@oracle/styles/units/borders';
// import { SHARED_TEXT_STYLES } from '@oracle/elements/Text';
// import { transition } from '@oracle/styles/mixins';
// import { useModelTheme as useModelThemeContext } from '@context/ModelTheme';

export type LinkProps = {
  autoHeight?: boolean;
  block?: boolean;
  bold?: boolean;
  centerAlign?: boolean;
  children?: any;
  danger?: boolean;
  default?: boolean;
  disabled?: boolean;
  flex?: number;
  fitContent?: boolean;
  fitContentWidth?: boolean;
  fullHeight?: boolean;
  fullWidth?: boolean;
  height?: number;
  href?: string;
  info?: boolean;
  inline?: boolean;
  large?: boolean;
  lineHeight?: number;
  monospace?: boolean;
  muted?: boolean;
  noColor?: boolean;
  noHoverUnderline?: boolean;
  noOutline?: boolean;
  onClick?: (event: any) => void;
  onContextMenuClick?: (event: any) => void;
  onFocus?: (event: any) => void;
  onMouseEnter?: any;
  onMouseLeave?: any;
  openNewWindow?: boolean;
  overflow?: string;
  pointerEventsEnabled?: boolean;
  preventDefault?: boolean;
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
  useModelTheme?: boolean;
  warning?: boolean;
  weightStyle?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  width?: number;
  withArrowIcon?: boolean;
  withChevronIcon?: boolean;
  withIcon?: boolean;
  wordWrap?: boolean;
  xsmall?: boolean;
};

export const SHARED_LINK_STYLES = css`
  ${transition()}
  outline: none;
  text-decoration: none;

  &:focus {
    outline: none;
  }

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
`;

const LinkStyle = styled.a<LinkProps>`
  ${SHARED_LINK_STYLES}
  ${SHARED_TEXT_STYLES}

  border-radius: ${BORDER_RADIUS}px;
  position: relative;
  z-index: 1;

  ${(props) =>
    !props.danger &&
    !props.earth &&
    !props.energy &&
    !props.fire &&
    !props.noColor &&
    !props.sameColorAsText &&
    !props.secondary &&
    !props.warning &&
    !props.water &&
    !props.wind &&
    `
    color: ${(props.theme.brand || light.brand).wind500};
  `}

  ${props => props.centerAlign && `
    text-align: center;
  `}

  ${props => props.danger && `
    color: ${(props.theme.interactive || light.interactive).dangerBorder} !important;

    &:active,
    &:focus,
    &:hover {
      color: ${(props.theme.interactive || light.interactive).dangerBorder} !important;
    }
  `}

  ${props => props.warning && `
    color: ${(props.theme.brand || light.brand).energy500} !important;

    &:active,
    &:focus,
    &:hover {
      color: ${(props.theme.brand || light.brand).energy500} !important;
    }
  `}

  ${props => props.info && `
    color: ${(props.theme.brand || light.brand).water500} !important;

    &:active,
    &:focus,
    &:hover {
      color: ${(props.theme.brand || light.brand).water500} !important;
    }
  `}

  ${props => !props.noHoverUnderline && !props.sameColorAsText && !props.secondary && `
    &:hover {
      color: ${(props.theme.brand || light.brand).wind500};
    }
  `}

  ${props => props.secondary && `
    color: ${(props.theme.interactive || light.interactive).linkSecondary};
    &:hover {
      color: ${(props.theme.interactive || light.interactive).linkSecondary};
    }
  `}

  ${props => props.selected && `
    background: ${(props.theme.brand || light.brand).wind400SuperTransparent};
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme.brand || light.brand).wind400};
  `}

  ${props => props.transparentBorder && `
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} transparent;
  `}

  ${props => props.autoHeight && `
    line-height: inherit !important;
  `}

  ${props => !props.autoHeight && `
    // This breaks Safari. What was it originally used for? I forgot...
    // height: -webkit-fill-available;
  `}

  ${props => props.fitContent && `
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
      box-shadow: 0 0 0 ${OUTLINE_WIDTH}px ${(props.theme.interactive || light.interactive).focusBorder};
    }
  `}

  ${props => props.block && `
    display: block;
  `}

  ${props => props.sameColorAsText && !props.disabled && `
    color: ${(props.theme.content || light.content).active};

    &:hover {
      color: ${(props.theme.content || light.content).active};
    }
  `}

  ${props => props.muted && !props.disabled && `
    color: ${(props.theme.monotone || light.monotone).grey300};

    &:hover,
    &:focus {
      color: ${(props.theme.monotone || light.monotone).grey300};
    }
  `}

  ${props => props.disabled && !props.invertedTheme && `
    color: ${(props.theme.content || light.content).disabled};
    cursor: not-allowed;

    &:focus,
    &:hover {
      color: ${(props.theme.content || light.content).disabled};
    }
  `}

  ${props => props.disabled && props.invertedTheme && `
    color: ${(props.theme.monotone || light.monotone).grey300};
    cursor: not-allowed;

    &:focus,
    &:hover {
      color: ${(props.theme.monotone || light.monotone).grey300};
    }
  `}

  ${props => props.default && !props.disabled && !props.invertedTheme && `
    color: ${(props.theme.monotone || light.monotone).grey400};

    &:hover {
      color: ${(props.theme.monotone || light.monotone).grey400};
    }
  `}

  ${props => props.default && !props.disabled && props.invertedTheme && `
    color: ${(props.theme.contentInverted || light.contentInverted).default};

    &:hover {
      color: ${(props.theme.contentInverted || light.contentInverted).active};
    }
  `}

  ${props => props.overflow && `
    overflow: ${props.overflow};
  `}

  ${props => props.textOverflow && `
    overflow: hidden;
    text-overflow: ${props.textOverflow};
  `}

  ${props => props.width && `
    overflow: hidden;
    max-width: ${props.width}px;
    text-overflow: ellipsis;
    width: 100%;
    white-space: nowrap;
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

  ${props => props.inverted && !props.disabled && `
    color: ${(props.theme.content || light.content).inverted};

    &:hover,
    &:focus {
      color: ${(props.theme.content || light.content).inverted};
    }
  `}

  ${props => (props.withArrowIcon || props.withChevronIcon || props.withIcon) && `
    align-items: center;
    display: flex;
    width: fit-content;
  `}

  ${props => typeof props.height !== 'undefined' && `
    height: ${props.height}px;
  `}
`;

const Link = ({
  children,
  disabled,
  href = '#',
  muted,
  onClick,
  onContextMenuClick,
  onFocus,
  openNewWindow,
  preventDefault,
  sameColorAsText,
  selected,
  target,
  transparentBorder,
  useModelTheme,
  weightStyle = 3,
  withArrowIcon,
  withChevronIcon,
  ...props
}: {
  children: any;
} & LinkProps, ref) => {
  // const { sharedProps } = useModelThemeContext();

  return (
    <LinkStyle
      {...props}
      // {...(useModelTheme ? sharedProps : {})}
      disabled={disabled}
      href={href}
      muted={muted}
      onClick={(e) => {
        if (disabled || preventDefault) {
          e.preventDefault();
        }
        if (onClick && !disabled) {
          onClick(e);
        }
      }}
      onContextMenu={(e) => {
        if (disabled || preventDefault) {
          e.preventDefault();
        }
        if (onContextMenuClick && !disabled) {
          onContextMenuClick(e);
        }
      }}
      onFocus={e => onFocus?.(e)}
      preventDefault={preventDefault}
      sameColorAsText={sameColorAsText}
      selected={selected}
      target={target || (openNewWindow ? '_blank noopener noreferrer' : null)}
      transparentBorder={transparentBorder}
      weightStyle={weightStyle}
      withArrowIcon={withArrowIcon}
      withChevronIcon={withChevronIcon}
    >
      {children}

      {(withArrowIcon || withChevronIcon) && (
        <span>
          &nbsp;
        </span>
      )}

      {withArrowIcon && (
        <ArrowRight
          muted={muted}
        />
      )}

      {withChevronIcon && (
        <ChevronRight
          muted={muted}
        />
      )}
    </LinkStyle>
  );
};

export default React.forwardRef(Link);
