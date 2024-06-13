import { css } from 'styled-components';

export type StyleProps = {
  className?: string;
  color?: string;
  colorName?: string;
  fill?: string;
  height?: number;
  inverted?: boolean;
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
  ${({ color, colorName, fill, inverted, theme, useStroke }) =>
    !useStroke &&
    `
    fill: ${
      typeof color !== 'undefined'
        ? color
        : typeof colorName !== 'undefined'
          ? theme.colors[colorName]
          : typeof fill !== 'undefined' && fill !== null
            ? fill
            : inverted
              ? theme.icons.color.inverted
              : theme.icons.color.base
    };
  `}

  ${({ color, colorName, inverted, stroke, theme, useStroke }) =>
    useStroke &&
    `
    stroke: ${
      typeof color !== 'undefined'
        ? color
        : typeof colorName !== 'undefined'
          ? theme.colors[colorName]
          : typeof stroke !== 'undefined' && stroke !== null
            ? stroke
            : inverted
              ? theme.icons.color.inverted
              : theme.icons.color.base
    };
  `}
`;

const svg = css<StyleProps>`
  ${({ height, size, small, theme, width, xsmall }) => `
    height: ${
      typeof height === 'undefined' && typeof size === 'undefined'
        ? theme.icons.size[small ? 'sm' : xsmall ? 'xs' : 'base']
        : typeof height === 'undefined'
          ? size
          : height
    }px;
    width: ${
      typeof width === 'undefined' && typeof size === 'undefined'
        ? theme.icons.size[small ? 'sm' : xsmall ? 'xs' : 'base']
        : typeof width === 'undefined'
          ? size
          : width
    }px;
  `}
`;

export { svg };
export default icons;
