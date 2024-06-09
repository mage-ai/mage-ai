import { css } from 'styled-components';
import { UNIT } from '../themes/spaces';
import borders, { bordersTransparent } from './borders';
import text, { StyleProps as TextStyleProps } from './typography';
import { outlineHover, transition } from './mixins';

export type StyleProps = {
  basic?: boolean;
  grouped?: boolean
  primary?: boolean;
  secondary?: boolean;
} & TextStyleProps;

const shared = css<StyleProps>`
  ${transition}
  ${text}

  ${({ basic, grouped, primary, secondary, theme }) =>
    outlineHover({
      borderColor: theme.fonts.color.text.inverted,
      outlineColor: primary
        ? theme.buttons.border.color.primary.hover
        : secondary
          ? theme.buttons.border.color.secondary.hover
          : basic
            ? theme.buttons.border.color.basic.hover
            : theme.buttons.border.color.base.hover,
      outlineOffset: grouped ? UNIT : null,
    })}

  ${({ grouped }) => grouped && `
    border: none;
  `}

  ${({ basic, grouped }) => !grouped && basic && borders}
  ${({ basic, grouped, primary, secondary, theme }) => !grouped && basic && `
    border-color: ${primary
      ? theme.buttons.border.color.primary.default
      : secondary
        ? theme.buttons.border.color.secondary.default
        : basic
          ? theme.buttons.border.color.basic.default
          : theme.buttons.border.color.base.default};
  `}

  ${({ basic, grouped, primary, secondary, theme }) => !grouped && basic && `
    &:hover {
      border-color: ${primary
        ? theme.buttons.border.color.primary.hover
        : secondary
          ? theme.buttons.border.color.secondary.hover
          : basic
            ? theme.buttons.border.color.basic.hover
            : theme.buttons.border.color.base.hover};
    }
  `}

  ${({ basic, grouped }) => !grouped && !basic && bordersTransparent}

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

  ${({ basic, grouped, primary, secondary, theme }) => !grouped && `
    &:hover {
      background-color: ${
        primary
          ? theme.colors.backgrounds.button.primary.hover
          : secondary
            ? theme.colors.backgrounds.button.secondary.hover
            : basic
              ? theme.colors.backgrounds.button.basic.hover
              : theme.colors.backgrounds.button.base.hover};
    }
  `}

  &:hover {
    cursor: pointer;
  }
`;

const base = css<StyleProps>`
  ${shared}
  font-size: ${({ theme }) => theme.fonts.size.base};
  padding: ${({ grouped, theme }) => grouped ? 0 : theme.buttons.padding.base};
`;

export const sm = css<StyleProps>`
  ${shared}
  font-size: ${({ theme }) => theme.fonts.size.sm};
  padding: ${({ grouped, theme }) => grouped ? 0 : theme.buttons.padding.sm};
`;

export default base;
