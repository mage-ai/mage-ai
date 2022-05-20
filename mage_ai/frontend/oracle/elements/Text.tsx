import styled, { css } from 'styled-components';
import { media } from 'styled-bootstrap-grid';

import light from '@oracle/styles/themes/light';
import {
  FONT_FAMILY_BOLD,
  // FONT_FAMILY_DEMI_BOLD,
  // FONT_FAMILY_EXTRA_BOLD,
  // FONT_FAMILY_EXTRA_LIGHT,
  // FONT_FAMILY_HEAVY,
  FONT_FAMILY_LIGHT,
  FONT_FAMILY_MEDIUM,
  FONT_FAMILY_REGULAR,
  FONT_FAMILY_THIN,
} from '@oracle/styles/fonts/primary';
// import {
//   FONT_FAMILY_BOLD as SECONDARY_FONT_FAMILY_BOLD,
//   FONT_FAMILY_REGULAR as SECONDARY_FONT_FAMILY_REGULAR,
// } from '@oracle/styles/fonts/secondary';
import {
  // LARGE,
  // LARGE_LG,
  // LARGE_SM,
  REGULAR,
  SMALL,
  XLARGE,
  // XSMALL,
  // XXLARGE,
} from '@oracle/styles/fonts/sizes';
// import { useModelTheme as useModelThemeContext } from '@context/ModelTheme';

export type TextProps = {
  alert?: boolean;
  bold?: boolean;
  breakAll?: boolean;
  breakSpaces?: boolean;
  center?: boolean;
  children?: any;
  color?: string;
  danger?: boolean;
  default?: boolean;
  disableWordBreak?: boolean;
  disabled?: boolean;
  editorial?: boolean;
  fullwidth?: boolean;
  grey300?: boolean;
  grey400?: boolean;
  info?: boolean;
  inline?: boolean;
  inlineText?: boolean;
  inverted?: boolean;
  invertedTheme?: boolean;
  italic?: boolean;
  large?: boolean;
  largeLg?: boolean;
  letterSpacing?: number;
  largeSm?: boolean;
  leftAligned?: boolean;
  lineHeight?: number;
  lineHeightUnit?: number;
  lineThrough?: boolean;
  minWidth?: number | string;
  maxWidth?: number | string;
  monospace?: boolean;
  muted?: boolean;
  neutral300?: boolean;
  noColor?: boolean;
  noWrapping?: boolean;
  overflow?: string;
  overflowWrap?: boolean;
  primary?: boolean;
  raw?: boolean;
  rightAligned?: boolean;
  small?: boolean;
  textOverflow?: boolean;
  title?: string;
  underline?: boolean;
  uppercase?: boolean;
  useModelTheme?: boolean;
  warning?: boolean;
  weightStyle?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  white?: boolean;
  whiteSpaceNormal?: boolean;
  width?: number;
  wordBreak?: boolean;
  xlarge?: boolean;
  xsmall?: boolean;
  xxlarge?: boolean;
};

export const SHARED_LARGE_TEXT_RESPONSIVE_STYLES = css`
  ${media.xs`
    ${props => props.largeSm && `
      ${REGULAR}
    `}

    ${props => props.large && `
      ${LARGE_SM}
    `}

    ${props => props.largeLg && `
      ${LARGE}
    `}

    ${props => props.xlarge && `
      ${LARGE_LG}
    `}
  `}

  ${media.sm`
    ${props => props.largeSm && `
      ${LARGE_SM}
    `}

    ${props => props.large && `
      ${LARGE_SM}
    `}

    ${props => props.largeLg && `
      ${LARGE}
    `}

    ${props => props.xlarge && `
      ${LARGE_LG}
    `}
  `}

  ${media.md`
    ${props => props.largeSm && `
      ${LARGE_SM}
    `}

    ${props => props.large && `
      ${LARGE_SM}
    `}

    ${props => props.largeLg && `
      ${LARGE}
    `}

    ${props => props.xlarge && `
      ${LARGE_LG}
    `}
  `}

  ${media.lg`
    ${props => props.largeSm && `
      ${LARGE_SM}
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
  `}

  ${media.xl`
    ${props => props.largeSm && `
      ${LARGE_SM}
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
  `}
`;

export const SHARED_TEXT_STYLES = css`
  ${SHARED_LARGE_TEXT_RESPONSIVE_STYLES}

  ${props => !props.large && !props.largeLg && !props.small && !props.xsmall && `
    ${REGULAR}
  `}
  ${props => !props.large && !props.small && !props.xsmall && props.editorial && `
    line-height: 24px !important;
  `}

  ${props => props.small && `
    ${SMALL}
  `}

  ${props => props.xsmall && `
    ${XSMALL}
  `}

  ${props => props.xxlarge && `
    ${XXLARGE}
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 0 && `
    font-family: ${FONT_FAMILY_THIN};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 1 && `
    font-family: ${FONT_FAMILY_EXTRA_LIGHT};
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

  ${props => !props.monospace && Number(props.weightStyle) === 5 && `
    font-family: ${FONT_FAMILY_DEMI_BOLD};
  `}

  ${props => !props.monospace && (Number(props.weightStyle) === 6 || props.bold) && `
    font-family: ${FONT_FAMILY_BOLD};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 7 && `
    font-family: ${FONT_FAMILY_EXTRA_BOLD};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 8 && `
    font-family: ${FONT_FAMILY_HEAVY};
  `}

  ${props => props.monospace && !props.bold && `
    font-family: ${SECONDARY_FONT_FAMILY_REGULAR};
    word-break: break-all;
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

  ${props => props.monospace && props.bold && `
    font-family: ${SECONDARY_FONT_FAMILY_BOLD};
    font-style: normal;
    font-weight: 700; // Needs this here or else it won’t be bold
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
`;

export const SHARED_STYLES = css<TextProps>`
  margin: 0;

  ${SHARED_TEXT_STYLES}

  ${props => !(props.default && props.disabled && props.inverted && props.muted) && !props.noColor && !props.invertedTheme && `
    color: ${(props.theme.content || light.content).active};
  `}

  ${props => !(props.default && props.disabled && props.inverted && props.muted) && !props.noColor && props.invertedTheme && `
    color: ${(props.theme.contentInverted || light.contentInverted).active};
  `}

  ${props => props.noColor && `
    opacity: 0;
    cursor: default;
  `}

  ${props => props.color && `
    color: ${props.color} !important;
  `}

  ${props => props.default && !props.invertedTheme && `
    color: ${(props.theme.monotone || light.monotone).grey400};
  `}

  ${props => props.default && props.invertedTheme && `
    color: ${(props.theme.contentInverted || light.contentInverted).default};
  `}

  ${props => props.disabled && `
    color: ${(props.theme.content || light.content).disabled};
  `}

  ${props => props.info && `
    color: ${(props.theme.accent || light.accent).info};
  `}

  ${props => props.inverted && `
    color: ${(props.theme.content || light.content).inverted};
  `}

  ${props => props.muted && !props.invertedTheme && `
    color: ${(props.theme.monotone || light.monotone).grey300};
  `}

  ${props => props.muted && props.invertedTheme && `
    color: ${(props.theme.monotone || light.monotone).grey300};
  `}

  ${props => props.neutral300 && `
    color: ${(props.theme.neutral || light.neutral).n300};
  `}

  ${props => props.grey300 && `
    color: ${(props.theme.monotone || light.monotone).grey300};
  `}

  ${props => props.grey400 && `
    color: ${(props.theme.monotone || light.monotone).grey400};
  `}

  ${props => props.white && `
    color: ${(props.theme.monotone || light.monotone).white};
  `}

  ${props => props.primary && `
    color: ${(props.theme.interactive || light.interactive).primaryAction};
  `}

  ${props => props.warning && `
    color: ${(props.theme.accent || light.accent).warning};
  `}

  ${props => props.danger && `
    color: ${(props.theme.interactive || light.interactive).dangerBorder} !important;
  `}

  ${props => props.alert && `
    color: ${(props.theme.accent || light.accent).alert};
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

  ${props => props.fullwidth && `
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
  useModelTheme,
  ...props
}: TextProps) => {
  const muted = typeof mutedProp === 'undefined' ? false : mutedProp;
  const El = props?.inline ? SpanStyle : TextStyle;

  const { sharedProps } = useModelThemeContext();
  const combinedProps = {
    ...props,
    ...(useModelTheme ? sharedProps : {}),
  };

  if (raw) {
    return (
      <El
        {...combinedProps}
        dangerouslySetInnerHTML={{ __html: children }}
        muted={muted}
      />
    );
  }

  return (
    <El {...combinedProps} muted={muted}>
      {children}
    </El>
  );
};

Text.defaultProps = {
  weightStyle: 3,
};

export default Text;
