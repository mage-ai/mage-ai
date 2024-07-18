import { css } from 'styled-components';
import text, { StyleProps as TextStyleProps } from './typography';
import borders from './borders';
import { outlineHover, transition } from './mixins';

export type StyleProps = {
  align?: 'left' | 'center' | 'right';
  basic?: boolean;
  blendWithText?: boolean;
  italicPlaceholder?: boolean;
  monospace?: boolean;
  small?: boolean;
  width?: number | string;
} & TextStyleProps;

const shared = css<StyleProps>`
  ${transition}
  ${text}

  ${({ blendWithText }) => !blendWithText && borders}

  ${({ basic, blendWithText, theme }) =>
    !basic &&
    !blendWithText &&
    `
    border-color: ${theme.inputs.border.color.base.default};
  `}

  ${({ blendWithText, small, theme }) =>
    blendWithText
      ? `
    background-color: none;
    background: none;
    border-color: none;
    border-radius: 0;
    border-style: none;
    border-width: 0px;
    borders: none;
    padding-left: 0;
    padding-right: 0;
    padding-bottom: ${small ? '4px' : theme.inputs.padding.vertical.xs};
    padding-top: ${small ? '4px' : theme.inputs.padding.vertical.xs};
  `
      : `
    background: ${theme.inputs.background.base.default};
    border-radius: ${theme.inputs.border.radius.base};
    border-style: ${theme.inputs.border.style.base};
    border-width: ${theme.inputs.border.width.base};
    padding-left: ${theme.inputs.padding.horizontal[small ? 'sm' : 'base']};
    padding-right: ${theme.inputs.padding.horizontal[small ? 'sm' : 'base']};
    padding-bottom: ${theme.inputs.padding.vertical[small ? 'sm' : 'base']};
    padding-top: ${theme.inputs.padding.vertical[small ? 'sm' : 'base']};
  `}

  width: ${({ width }) =>
    typeof width === 'undefined' ? '100%' : typeof width === 'number' ? `${width}px` : width};

  ${({ align, basic, blendWithText, italicPlaceholder, small, theme }) => `
    font-family: ${theme.fonts.family.base[small ? 'regular' : 'medium']};
    font-weight: ${theme.fonts.weight.medium};
    line-height: ${theme.fonts.lineHeight.base};
    text-align: ${align || 'left'};

    ::-webkit-input-placeholder {
      color: ${theme.inputs.placeholder.color};
      font-style: ${italicPlaceholder ? 'italic' : 'normal'};
    }
    ::-moz-placeholder {
      color: ${theme.inputs.placeholder.color};
      font-style: ${italicPlaceholder ? 'italic' : 'normal'};
    }
    :-ms-input-placeholder {
      color: ${theme.inputs.placeholder.color};
      font-style: ${italicPlaceholder ? 'italic' : 'normal'};
    }
    :-moz-placeholder {
      color: ${theme.inputs.placeholder.color};
      font-style: ${italicPlaceholder ? 'italic' : 'normal'};
    }
    ::placeholder {
      color: ${theme.inputs.placeholder.color};
      font-style: ${italicPlaceholder ? 'italic' : 'normal'};
    }

    &:focus {
      background: ${blendWithText ? 'none' : theme.inputs.background.base.focus};
      border-color: ${
        blendWithText
          ? 'none'
          : basic
            ? theme.inputs.border.color.base.default
            : theme.inputs.border.color.base.focus
      };
    }

    &:hover {
      background: ${blendWithText ? 'none' : theme.inputs.background.base.hover};
      border-color: ${
        blendWithText
          ? 'none'
          : basic
            ? theme.inputs.border.color.base.default
            : theme.inputs.border.color.base.hover
      };
    }

    &:active {
      background: ${blendWithText ? 'none' : theme.inputs.background.base.active};
      border-color: ${
        blendWithText
          ? 'none'
          : basic
            ? theme.inputs.border.color.base.default
            : theme.inputs.border.color.base.active
      };
    }
  `}

  ${({ basic, blendWithText, theme }) =>
    !blendWithText &&
    outlineHover({
      active: true,
      borderColor: theme.fonts.color.text.inverted,
      outlineColor: basic
        ? theme.inputs.border.color.base.default
        : theme.inputs.border.color.base.hover,
    })}
`;

const base = css<StyleProps>`
  ${shared}
`;

export default base;
