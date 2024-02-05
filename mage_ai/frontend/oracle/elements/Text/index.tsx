import React from 'react';
import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import {
  FONT_FAMILY_BOLD,
  FONT_FAMILY_LIGHT,
  FONT_FAMILY_MEDIUM,
  FONT_FAMILY_REGULAR,
  FONT_FAMILY_THIN,
  MONO_FONT_FAMILY_BOLD,
  MONO_FONT_FAMILY_REGULAR,
} from '@oracle/styles/fonts/primary';
import {
  HEADLINE_SIZE,
  LARGE,
  LARGE_LG,
  REGULAR,
  SMALL,
  XLARGE,
  XSMALL,
} from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

export type TextProps = {
  backgroundColor?: string;
  bold?: boolean;
  black?: boolean;
  breakAll?: boolean;
  breakSpaces?: boolean;
  center?: boolean;
  children?: any;
  color?: string;
  cyan?: boolean;
  cursor?: string;
  danger?: boolean;
  dbt?: boolean;
  default?: boolean;
  disableWordBreak?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  headline?: boolean;
  info?: boolean;
  inline?: boolean;
  inlineText?: boolean;
  inverted?: boolean;
  italic?: boolean;
  large?: boolean;
  largeSm?: boolean;
  largeLg?: boolean;
  letterSpacing?: number;
  leftAligned?: boolean;
  lineHeight?: number;
  lineHeightUnit?: number;
  lineThrough?: boolean;
  minWidth?: number | string;
  maxWidth?: number | string;
  monospace?: boolean;
  muted?: boolean;
  noColor?: boolean;
  noWrapping?: boolean;
  overflow?: string;
  overflowWrap?: boolean;
  pre?: boolean;
  preWrap?: boolean;
  primary?: boolean;
  raw?: boolean;
  rightAligned?: boolean;
  secondary?: boolean;
  sky?: boolean;
  small?: boolean;
  strikethrough?: boolean;
  success?: boolean;
  textOverflow?: boolean;
  textOverflowLines?: number;
  title?: string;
  underline?: boolean;
  uppercase?: boolean;
  warning?: boolean;
  weightStyle?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  wind?: boolean;
  whiteSpaceNormal?: boolean;
  width?: number;
  wordBreak?: boolean;
  xlarge?: boolean;
  xsmall?: boolean;
};

export const SHARED_LARGE_TEXT_RESPONSIVE_STYLES = css<{
  largeSm?: boolean;
  large?: boolean;
  largeLg?: boolean;
  xlarge?: boolean;
}>`
`;

export const SHARED_TEXT_STYLES = css<TextProps>`
  ${props => !props.xsmall && !props.small && !props.large && !props.largeLg && !props.xlarge && `
    ${REGULAR}
  `}

  ${props => props.xsmall && `
    ${XSMALL}
  `}

  ${props => props.small && `
    ${SMALL}
  `}

  ${props => props.large && `
    ${LARGE}
  `}

  ${props => props.largeLg && `
    ${LARGE_LG}
  `}

  ${props => props.xlarge && `
    ${XLARGE}
  `}

  ${props => props.headline && `
    ${HEADLINE_SIZE}
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 0 && `
    font-family: ${FONT_FAMILY_THIN};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 2 && `
    font-family: ${FONT_FAMILY_LIGHT};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 3 && `
    font-family: ${FONT_FAMILY_REGULAR};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 4 && `
    font-family: ${FONT_FAMILY_MEDIUM};
  `}

  ${props => !props.monospace && (Number(props.weightStyle) === 6 || props.bold) && `
    font-family: ${FONT_FAMILY_BOLD};
  `}

  ${props => props.monospace && !props.bold && `
    font-family: ${MONO_FONT_FAMILY_REGULAR};
    word-break: break-all;
  `}

  ${props => props.monospace && props.bold && `
    font-family: ${MONO_FONT_FAMILY_BOLD};
    font-style: normal;
    font-weight: 700;
  `}

  ${props => props.disableWordBreak && `
    word-break: normal !important;
  `}

  ${props => props.wordBreak && `
    word-break: break-word;
  `}

  ${props => props.overflowWrap && `
    overflow-wrap: break-word;
  `}

  ${props => props.letterSpacing && `
    letter-spacing: ${props.letterSpacing}px;
  `}

  ${props => props.breakAll && `
    word-break: break-all;
  `}

  ${props => props.lineHeight && `
    line-height: ${props.lineHeight}px !important;
  `}

  ${props => props.lineHeightUnit && `
    line-height: ${props.lineHeightUnit} !important;
  `}

  ${props => props.breakSpaces && `
    white-space: break-spaces;
  `}

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
    padding: 0 ${UNIT / 2}px;
  `}

  ${props => props.wind && !props.disabled && `
    color: ${(props.theme.brand || dark.brand).wind500} !important;
  `}

  ${props => props.cursor && `
    cursor: ${props.cursor};
  `}

  ${props => props.strikethrough && `
    text-decoration: line-through;
  `}
`;

export const SHARED_STYLES = css<TextProps>`
  margin: 0;

  ${SHARED_TEXT_STYLES}

  ${props => !(props.default && props.disabled  && props.muted) && !props.noColor && `
    color: ${(props.theme.content || dark.content).active};
  `}

  ${props => props.default && `
    color: ${(props.theme.content || dark.content).default};
  `}

  ${props => props.inverted && `
    color: ${(props.theme.content || dark.content).inverted};
  `}

  ${props => props.muted && `
    color: ${(props.theme.content || dark.content).muted};
  `}

  ${props => props.noColor && `
    opacity: 0;
    cursor: default;
  `}

  ${props => props.color && `
    color: ${props.color} !important;
  `}

  ${props => props.disabled && `
    color: ${(props.theme.content || dark.content).disabled};
  `}

  ${props => props.cyan && `
    color: ${(props.theme.accent || dark.accent).cyan};
  `}

  ${props => props.dbt && `
    color: ${(props.theme || dark).accent.dbt};
  `}

  ${props => props.sky && `
    color: ${(props.theme || dark)?.interactive?.linkTextLight};
  `}

  ${props => props.black && `
    color: ${(props.theme.monotone || dark.monotone).black};
  `}

  ${props => props.primary && `
    color: ${(props.theme.interactive || dark.interactive).linkPrimary};
  `}

  ${props => props.secondary && `
    color: ${(props.theme.interactive || dark.interactive).linkSecondary};
  `}

  ${props => props.danger && `
    color: ${(props.theme.interactive || dark.interactive).dangerBorder};
  `}

  ${props => props.info && `
    color: ${(props.theme.accent || dark.accent).info};
  `}

  ${props => props.warning && `
    color: ${(props.theme.accent || dark.accent).yellow};
  `}

  ${props => props.success && `
    color: ${(props.theme.status || dark.status).positive};
  `}

  ${props => props.underline && `
    text-decoration: underline;
  `}

  ${props => props.uppercase && `
    text-transform: uppercase;
  `}

  ${props => props.lineThrough && `
    text-decoration: line-through;
  `}

  ${props => props.center && `
    text-align: center;
  `}

  ${props => props.leftAligned && `
    text-align: left;
  `}

  ${props => props.rightAligned && `
    text-align: right;
  `}

  ${props => (props.inline || props.inlineText) && `
    display: inline;
  `}

  ${props => props.width && `
    overflow: hidden;
    max-width: ${props.width}px;
    text-overflow: ellipsis;
    width: 100%;
    white-space: nowrap;
  `}

  ${props => props.fullWidth && `
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
    width: 100%;
    white-space: normal;
  `}

  ${props => props.textOverflow && `
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}

  ${props => props.textOverflowLines && `
    -webkit-box-orient: vertical;
    -webkit-line-clamp: ${props.textOverflowLines};
    display: -webkit-box;
    overflow: hidden;
  `}

  ${props => (props.minWidth || props.maxWidth) && `
    overflow: hidden;
    ${props.minWidth ? `min-width: ${props.minWidth}px;` : ''}
    ${props.maxWidth ? `max-width: ${props.maxWidth}px;` : ''}
    text-overflow: ellipsis;
    width: 100%;
    white-space: nowrap;
  `}

  ${props => props.overflow && `
    overflow: ${props.overflow};
  `}

  ${props => props.italic && `
    font-style: italic;
  `}

  ${props => props.noWrapping && `
    white-space: nowrap;
  `}

  ${props => props.whiteSpaceNormal && `
    white-space: normal;
  `}

  ${props => props.pre && `
    white-space: pre;
  `}

  ${props => props.preWrap && `
    white-space: pre-wrap;
  `}
`;

const TextStyle = styled.p<TextProps>`
  ${SHARED_STYLES}
`;

const SpanStyle = styled.span<TextProps>`
  ${SHARED_STYLES}
`;

const Text = ({
  children,
  muted: mutedProp,
  raw,
  weightStyle = 3,
  ...props
}: TextProps, ref) => {
  let muted = false;

  if (mutedProp === true) {
    muted = true;
  }
  const El = props?.inline ? SpanStyle : TextStyle;

  const combinedProps = {
    ...props,
    ...({}),
    muted,
    weightStyle,
  };

  if (raw) {
    return (
      <El
        {...combinedProps}
        dangerouslySetInnerHTML={{ __html: children }}
        ref={ref}
      />
    );
  }

  return (
    <El {...combinedProps} ref={ref}>
      {children}
    </El>
  );
};


export default React.forwardRef(Text);
