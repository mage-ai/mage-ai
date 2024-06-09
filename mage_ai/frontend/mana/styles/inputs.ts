import { css } from 'styled-components';
import text, { StyleProps as TextStyleProps } from './typography';
import { outlineHover, transition } from './mixins';

export type StyleProps = {
  monospace?: boolean;
} & TextStyleProps;

const shared = css<StyleProps>`
  ${transition}
  ${text}

  background: ${({ theme }) => theme.inputs.background.base.default};
  border-color: ${({ theme }) => theme.inputs.border.color.base.default};
  border-radius: ${({ theme }) => theme.inputs.border.radius.base};
  border-style: ${({ theme }) => theme.inputs.border.style.base};
  border-width: ${({ theme }) => theme.inputs.border.width.base};
  font-weight: ${({ theme }) => theme.fonts.weight.medium};
  line-height: ${({ theme }) => theme.fonts.lineHeight.base};
  padding: ${({ theme }) => theme.inputs.padding.base};
  width: inherit;

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
    border-color: ${({ theme }) => theme.inputs.border.color.base.focus};
  }

  &:hover {
    background: ${({ theme }) => theme.inputs.background.base.hover};
    border-color: ${({ theme }) => theme.inputs.border.color.base.hover};
  }

  &:active {
    background: ${({ theme }) => theme.inputs.background.base.active};
    border-color: ${({ theme }) => theme.inputs.border.color.base.active};
  }

  ${({ theme }) =>
    outlineHover({
      active: true,
      borderColor: theme.fonts.color.text.inverted,
      outlineColor: theme.inputs.border.color.base.hover,
    })}
`;

const base = css<StyleProps>`
  ${shared}
`;

export default base;
