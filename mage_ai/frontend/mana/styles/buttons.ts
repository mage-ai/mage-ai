import { css } from 'styled-components';
import { UNIT } from '../themes/spaces';
import borders, { bordersTransparent } from './borders';
import text, { StyleProps as TextStyleProps } from './typography';
import { outlineHover, transition, transitionFast } from './mixins';

export type StyleProps = {
  asLink?: boolean;
  basic?: boolean;
  grouped?: boolean;
  primary?: boolean;
  secondary?: boolean;
} & TextStyleProps;

const shared = css<StyleProps>`
  ${({ asLink }) => (asLink ? transitionFast : transition)}
  ${text}

  ${({ asLink, basic, grouped, primary, secondary, theme }) =>
    outlineHover({
      borderColor: theme.fonts.color.text.inverted,
      outlineColor: primary
        ? theme.buttons.outline.color.primary.hover
        : secondary
          ? theme.buttons.outline.color.secondary.hover
          : asLink || basic
            ? theme.buttons.outline.color.basic.hover
            : theme.buttons.outline.color.base.hover,
      outlineOffset: grouped ? UNIT : null,
    })}

  ${({ grouped }) =>
    grouped &&
    `
    border: none;
  `}

  ${({ basic, grouped }) => !grouped && basic && borders}
  ${({ basic, grouped, primary, secondary, theme }) =>
    !grouped &&
    basic &&
    `
    border-color: ${
      primary
        ? theme.buttons.border.color.primary.default
        : secondary
          ? theme.buttons.border.color.secondary.default
          : basic
            ? theme.buttons.border.color.basic.default
            : theme.buttons.border.color.base.default
    };
  `}

  ${({ asLink, basic, grouped, primary, secondary, theme }) =>
    !grouped &&
    (asLink || basic) &&
    `
    &:hover {
      border-color: ${
        primary
          ? theme.buttons.border.color.primary.hover
          : secondary
            ? theme.buttons.border.color.secondary.hover
            : asLink || basic
              ? theme.buttons.border.color.basic.hover
              : theme.buttons.border.color.base.hover
      };
    }
  `}

  ${({ basic, grouped }) => !grouped && !basic && bordersTransparent}

  background-color: ${({ asLink, basic, primary, secondary, theme }) =>
    asLink
      ? 'transparent'
      : primary
        ? theme.colors.backgrounds.button.primary.default
        : secondary
          ? theme.colors.backgrounds.button.secondary.default
          : basic
            ? theme.colors.backgrounds.button.basic.default
            : theme.colors.backgrounds.button.base.default};
  border-radius: ${({ asLink, theme }) => theme.borders.radius[asLink ? 'sm' : 'base']};
  color: ${({ primary, secondary, theme }) =>
    primary || secondary ? theme.fonts.color.text.inverted : theme.fonts.color.text.base};

  font-style: ${({ theme }) => theme.fonts.style.base};

  font-family: ${({ primary, secondary, theme }) =>
    primary || secondary ? theme.fonts.family.base.bold : theme.fonts.family.base.semiBold};
  font-weight: ${({ primary, secondary, theme }) =>
    primary || secondary ? theme.fonts.weight.bold : theme.fonts.weight.semiBold};
  line-height: ${({ theme }) => theme.fonts.lineHeight.base};

  ${({ basic, grouped, primary, secondary, theme }) =>
    !grouped &&
    `
    &:hover {
      background-color: ${
        primary
          ? theme.colors.backgrounds.button.primary.hover
          : secondary
            ? theme.colors.backgrounds.button.secondary.hover
            : basic
              ? theme.colors.backgrounds.button.basic.hover
              : theme.colors.backgrounds.button.base.hover
      };
    }
  `}

  &:hover {
    cursor: pointer;
  }
`;

const base = css<StyleProps>`
  ${shared}
  font-size: ${({ theme }) => theme.fonts.size.base};
  padding: ${({ asLink, grouped, theme }) =>
    grouped ? 0 : asLink ? theme.buttons.padding.xs : theme.buttons.padding.base};
`;

export const sm = css<StyleProps>`
  ${shared}
  font-size: ${({ theme }) => theme.fonts.size.sm};
  padding: ${({ grouped, theme }) => (grouped ? 0 : theme.buttons.padding.sm)};
`;

export default base;
