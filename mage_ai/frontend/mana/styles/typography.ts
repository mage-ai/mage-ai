import { css } from 'styled-components';

export type StyleProps = {
  black?: boolean;
  bold?: boolean;
  inverted?: boolean;
  italic?: boolean;
  light?: boolean;
  medium?: boolean;
  monospace?: boolean;
  semiBold?: boolean;
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

  color: ${({ inverted, theme }) =>
    inverted ? theme.fonts.color.text.inverted : theme.fonts.color.text.base};

  font-size: ${({ theme }) => theme.fonts.size.base};
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

  line-height: ${({ monospace, theme }) =>
    monospace ? theme.fonts.lineHeight.monospace : theme.fonts.lineHeight.md};
`;

export const baseSm = css<StyleProps>`
  ${base}
  font-size: ${({ theme }) => theme.fonts.size.sm};
  line-height: ${({ theme }) => theme.fonts.lineHeight.base};
`;

export const baseXs = css<StyleProps>`
  ${base}
  font-size: ${({ theme }) => theme.fonts.size.xs};
  line-height: ${({ theme }) => theme.fonts.lineHeight.xs};
`;

export default base;
