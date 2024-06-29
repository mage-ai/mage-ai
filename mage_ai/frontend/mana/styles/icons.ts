import { css } from 'styled-components';

export type StyleProps = {
  className?: string;
  color?: string;
  colorName?: string;
  fill?: string;
  height?: number;
  inverted?: boolean;
  muted?: boolean;
  opacity?: number;
  size?: number;
  small?: boolean;
  stroke?: string;
  style?: any;
  useStroke?: boolean;
  viewBox?: string;
  width?: number;
  xsmall?: boolean;
};

const icons = css<StyleProps>`
  ${({ color, colorName, fill, inverted, muted, theme, useStroke }) => !useStroke && `
    fill: ${[
      typeof colorName !== 'undefined' && theme.colors[colorName],
      typeof color !== 'undefined' && color,
      fill ?? (inverted ? theme.icons.color.inverted : (muted ? theme.icons.muted : theme.icons.color.base)),
    ].filter(Boolean)[0]};
  `}

  ${({ color, colorName, inverted, stroke, muted, theme, useStroke }) => useStroke && `
    stroke: ${[
      typeof colorName !== 'undefined' && theme.colors[colorName],
      typeof color !== 'undefined' && color,
      stroke ?? (inverted ? theme.icons.color.inverted : (muted ? theme.icons.muted : theme.icons.color.base)),
    ].filter(Boolean)[0]};
  `}
`;

const svg = css<StyleProps>`
  ${({ height, size, small, theme, width, xsmall }) => `
    height: ${typeof height === 'undefined' && typeof size === 'undefined'
      ? theme.icons.size[small ? 'sm' : xsmall ? 'xs' : 'base']
      : typeof height === 'undefined'
        ? size
        : height
    }px;
    width: ${typeof width === 'undefined' && typeof size === 'undefined'
      ? theme.icons.size[small ? 'sm' : xsmall ? 'xs' : 'base']
      : typeof width === 'undefined'
        ? size
        : width
    }px;
  `}
`;

export { svg };
export default icons;
