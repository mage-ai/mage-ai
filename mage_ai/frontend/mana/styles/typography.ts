import { css } from 'styled-components';

export type StyleProps = {
  black?: boolean;
  blue?: boolean;
  bold?: boolean;
  inverted?: boolean;
  italic?: boolean;
  light?: boolean;
  medium?: boolean;
  monospace?: boolean;
  muted?: boolean;
  semiBold?: boolean;
  small?: boolean;
  xsmall?: boolean;
};

export const monospaceFontFamily = css<StyleProps>`
  font-family: ${({ black, bold, italic, light, medium, semiBold, theme }) =>
    light
      ? theme.fonts.family.monospace.lightFont
      : medium
        ? theme.fonts.family.monospace.medium
        : semiBold
          ? theme.fonts.family.monospace.semiBold
          : black || bold
            ? italic
              ? theme.fonts.family.monospace.boldItalic
              : theme.fonts.family.monospace.bold
            : italic
              ? theme.fonts.family.monospace.regularItalic
              : theme.fonts.family.monospace.regular};
`;

const baseFontFamily = css<StyleProps>`
  font-family: ${({ black, bold, light, medium, semiBold, theme }) =>
    light
      ? theme.fonts.family.base.lightFont
      : medium
        ? theme.fonts.family.base.medium
        : semiBold
          ? theme.fonts.family.base.semiBold
          : black
            ? theme.fonts.family.base.black
            : bold
              ? theme.fonts.family.base.bold
              : theme.fonts.family.base.regular};
`;

const base = css<StyleProps>`
  ${({ monospace }) => monospace && monospaceFontFamily}

  ${({ monospace }) => !monospace && baseFontFamily}

  color: ${({ blue, inverted, muted, theme }) =>
    inverted
      ? theme.fonts.color.text.inverted
      : blue
        ? theme.fonts.color.text.blue
        : muted
          ? theme.fonts.color.text.muted
          : theme.fonts.color.text.base};

  font-size: ${({ small, theme, xsmall }) =>
    small ? theme.fonts.size.sm : xsmall ? theme.fonts.size.xs : theme.fonts.size.base};

  font-style: ${({ italic, theme }) =>
    italic ? theme.fonts.style.italic : theme.fonts.style.base};
  font-weight: ${({ light, medium, semiBold, bold, theme }) =>
    light
      ? theme.fonts.weight.light
      : medium
        ? theme.fonts.weight.medium
        : semiBold
          ? theme.fonts.weight.semiBold
          : bold
            ? theme.fonts.weight.bold
            : theme.fonts.weight.regular};

  line-height: ${({ monospace, small, theme, xsmall }) =>
    small
      ? theme.fonts.lineHeight.base
      : xsmall
        ? theme.fonts.lineHeight.xs
        : monospace
          ? theme.fonts.lineHeight.monospace
          : theme.fonts.lineHeight.md};
`;

export const baseSm = css<StyleProps>`
  ${base}
`;

export const baseXs = css<StyleProps>`
  ${base}
`;

export default base;
