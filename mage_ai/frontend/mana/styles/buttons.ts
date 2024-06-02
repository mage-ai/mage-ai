import { css } from 'styled-components';
import borders from './borders';
import text, { StyleProps as TextStyleProps } from './typography';
import { outlineHover, transition } from './mixins';

export type StyleProps = {
  basic?: boolean;
  primary?: boolean;
  secondary?: boolean;
} & TextStyleProps;

const shared = css<StyleProps>`
  ${transition}

  ${({ primary, secondary, theme }) => outlineHover({
    borderColor: theme.colors.black,
    outlineColor: primary
      ? theme.colors.backgrounds.button.primary.default
      : secondary
        ? theme.colors.backgrounds.button.secondary.default
        : theme.colors.backgrounds.button.base.default,
  })}

  ${({ basic }) => basic
    ? borders
    : 'border: none;'
  }

  background-color: ${({ basic, primary, secondary, theme }) => primary
    ? theme.colors.backgrounds.button.primary.default
    : secondary
      ? theme.colors.backgrounds.button.secondary.default
      : basic
        ? 'transparent'
        : theme.colors.backgrounds.button.base.default
  };
  border-radius: ${({ theme }) => theme.borders.radius.base};
  color: ${({
    primary,
    secondary,
    theme,
  }) => (primary || secondary) ? theme.colors.black : theme.fonts.color.text.base};

  ${text}

  line-height: ${({ theme }) => theme.fonts.lineHeight.md};
  font-style: ${({ theme }) => theme.fonts.style.base};

  font-family: ${({
    primary,
    secondary,
    theme,
  }) => (primary || secondary) ? theme.fonts.family.base.bold : theme.fonts.family.base.semiBold};
  font-weight: ${({
    primary,
    secondary,
    theme,
  }) => (primary || secondary) ? theme.fonts.weight.bold : theme.fonts.weight.semiBold};

  &:hover {
    background-color: ${({ basic, primary, secondary, theme }) => primary
      ? theme.colors.backgrounds.button.primary.hover
      : secondary
        ? theme.colors.backgrounds.button.secondary.hover
        : basic
          ? 'transparent'
          : theme.colors.backgrounds.button.base.hover
    };
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
