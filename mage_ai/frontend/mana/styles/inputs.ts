import { css } from 'styled-components';
import text, { StyleProps as TextStyleProps } from './typography';
import borders from './borders';
import { outlineHover, transition } from './mixins';

export type StyleProps = {
  basic?: boolean;
  monospace?: boolean;
  small?: boolean;
  width?: number | string;
} & TextStyleProps;

const shared = css<StyleProps>`
  ${transition}
  ${text}
  ${borders}

  ${({ basic, theme }) =>
    !basic &&
    `
    border-color: ${theme.inputs.border.color.base.default};
  `}

  background: ${({ theme }) => theme.inputs.background.base.default};
  border-radius: ${({ theme }) => theme.inputs.border.radius.base};
  border-style: ${({ theme }) => theme.inputs.border.style.base};
  border-width: ${({ theme }) => theme.inputs.border.width.base};
  font-weight: ${({ theme }) => theme.fonts.weight.medium};
  line-height: ${({ theme }) => theme.fonts.lineHeight.base};
  padding: ${({ small, theme }) => theme.inputs.padding[small ? 'sm' : 'base']};
  width: ${({ width }) =>
    typeof width === 'undefined' ? '100%' : typeof width === 'number' ? `${width}px` : width};

  ::-webkit-input-placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }
  ::-moz-placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }
  :-ms-input-placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }
  :-moz-placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }
  ::placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }

  &:focus {
    background: ${({ theme }) => theme.inputs.background.base.focus};
    border-color: ${({ basic, theme }) =>
      basic ? theme.borders.color : theme.inputs.border.color.base.focus};
  }

  &:hover {
    background: ${({ theme }) => theme.inputs.background.base.hover};
    border-color: ${({ basic, theme }) =>
      basic ? theme.borders.color : theme.inputs.border.color.base.hover};
  }

  &:active {
    background: ${({ theme }) => theme.inputs.background.base.active};
    border-color: ${({ basic, theme }) =>
      basic ? theme.borders.color : theme.inputs.border.color.base.active};
  }

  ${({ basic, theme }) =>
    outlineHover({
      active: true,
      borderColor: theme.fonts.color.text.inverted,
      outlineColor: basic ? theme.borders.color : theme.inputs.border.color.base.hover,
    })}
`;

const base = css<StyleProps>`
  ${shared}
`;

export default base;
