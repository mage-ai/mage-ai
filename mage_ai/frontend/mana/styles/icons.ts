import { css } from 'styled-components';

export type StyleProps = {
  className?: string;
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
};

const icons = css<StyleProps>`
  ${({ fill, inverted, theme, useStroke }) =>
    !useStroke &&
    `
    fill: ${
      typeof fill !== 'undefined' && fill !== null
        ? fill
        : inverted
          ? theme.icons.color.inverted
          : theme.icons.color.base
    };
  `}

  ${({ inverted, stroke, theme, useStroke }) =>
    useStroke &&
    `
    stroke: ${
      typeof stroke !== 'undefined' && stroke !== null
        ? stroke
        : inverted
          ? theme.icons.color.inverted
          : theme.icons.color.base
    };
  `}
`;

const svg = css<StyleProps>`
  ${({ height, size, small, theme, width }) => `
    height: ${(typeof height === 'undefined' && typeof size === 'undefined')
      ? theme.icons.size[small ? 'sm' : 'base']
      : typeof height === 'undefined' ? size : height
    }px;
    width: ${(typeof width === 'undefined' && typeof size === 'undefined')
      ? theme.icons.size[small ? 'sm' : 'base']
      : typeof width === 'undefined' ? size : width
    }px;
  `}
`;

export { svg };
export default icons;
