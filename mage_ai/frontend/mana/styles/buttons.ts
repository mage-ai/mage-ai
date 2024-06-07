import { css } from 'styled-components';
import borders, { bordersTransparent } from './borders';
import text, { StyleProps as TextStyleProps } from './typography';
import { outlineHover, transition } from './mixins';

export type StyleProps = {
  basic?: boolean;
  primary?: boolean;
  secondary?: boolean;
} & TextStyleProps;

const shared = css<StyleProps>`
  ${transition}
  ${text}

  ${({ primary, secondary, theme }) =>
    outlineHover({
      borderColor: theme.fonts.color.text.inverted,
      outlineColor: primary
        ? theme.colors.backgrounds.button.primary.default
        : secondary
          ? theme.colors.backgrounds.button.secondary.default
          : theme.colors.backgrounds.button.base.default,
    })}

  ${({ basic }) => (basic ? borders : bordersTransparent)}

  background-color: ${({ basic, primary, secondary, theme }) =>
    primary
      ? theme.colors.backgrounds.button.primary.default
      : secondary
        ? theme.colors.backgrounds.button.secondary.default
        : basic
          ? theme.colors.backgrounds.button.basic.default
          : theme.colors.backgrounds.button.base.default};
  border-radius: ${({ theme }) => theme.borders.radius.base};
  color: ${({ primary, secondary, theme }) =>
    primary || secondary ? theme.fonts.color.text.inverted : theme.fonts.color.text.base};

  font-style: ${({ theme }) => theme.fonts.style.base};

  font-family: ${({ primary, secondary, theme }) =>
    primary || secondary ? theme.fonts.family.base.bold : theme.fonts.family.base.semiBold};
  font-weight: ${({ primary, secondary, theme }) =>
    primary || secondary ? theme.fonts.weight.bold : theme.fonts.weight.semiBold};
  line-height: ${({ theme }) => theme.fonts.lineHeight.base};

  &:hover {
    background-color: ${({ basic, primary, secondary, theme }) =>
      primary
        ? theme.colors.backgrounds.button.primary.hover
        : secondary
          ? theme.colors.backgrounds.button.secondary.hover
          : basic
            ? theme.colors.backgrounds.button.basic.hover
            : theme.colors.backgrounds.button.base.hover};
    cursor: pointer;
  }
`;

const base = css<StyleProps>`
  ${shared}
  font-size: ${({ theme }) => theme.fonts.size.base};
  padding: ${({ theme }) => theme.buttons.padding.base};
`;

export const sm = css<StyleProps>`
  ${shared}
  font-size: ${({ theme }) => theme.fonts.size.sm};
  padding: ${({ theme }) => theme.buttons.padding.sm};
`;

export default base;
