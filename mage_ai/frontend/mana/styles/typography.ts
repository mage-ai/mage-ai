import { css } from 'styled-components';

export type StyleProps = {
  black?: boolean;
  bold?: boolean;
  italic?: boolean;
  light?: boolean;
  medium?: boolean;
  monospace?: boolean;
  semiBold?: boolean;
};

const base = css<StyleProps>`
  color: ${({ theme }) => theme.fonts.color.text.base};

  font-family: ${({
    black,
    bold,
    italic,
    light,
    medium,
    monospace,
    semiBold,
    theme,
  }) => monospace
    ? light
      ? theme.fonts.family.monospace.light
      : medium
        ? theme.fonts.family.monospace.medium
        : semiBold
          ? theme.fonts.family.monospace.semiBold
          : (black || bold)
            ? (italic
              ? theme.fonts.family.monospace.boldItalic
              : theme.fonts.family.monospace.bold
            )
            : (italic
              ? theme.fonts.family.monospace.regularItalic
              : theme.fonts.family.monospace.regular
            )
    : light
      ? theme.fonts.family.base.light
      : medium
        ? theme.fonts.family.base.medium
        : semiBold
          ? theme.fonts.family.base.semiBold
          : bold
            ? theme.fonts.family.base.bold
            : black
              ? theme.fonts.family.base.black
              : theme.fonts.family.base.regular
  };

  font-size: ${({ theme }) => theme.fonts.size.base};
  font-style: ${({ italic, theme }) => italic ? theme.fonts.style.italic : theme.fonts.style.base};
  font-weight: ${({
    light,
    medium,
    semiBold,
    bold,
    theme,
  }) => light
    ? theme.fonts.weight.light
    : medium
      ? theme.fonts.weight.medium
      : semiBold
        ? theme.fonts.weight.semiBold
        : bold
          ? theme.fonts.weight.bold
          : theme.fonts.weight.regular
  };

  line-height: ${({ monospace, theme }) => monospace
  ? theme.fonts.lineHeight.monospace
  : theme.fonts.lineHeight.md};
`;

export const baseSm = css<StyleProps>`
  ${base}
  font-size: ${({ theme }) => theme.fonts.size.sm};
  line-height: ${({ theme }) => theme.fonts.lineHeight.base};
`;

export const baseXs = css<StyleProps>`
  ${baseSm}
  font-size: ${({ theme }) => theme.fonts.size.xs};
`;

export default base;
