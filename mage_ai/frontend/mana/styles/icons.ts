import { css } from 'styled-components';

export type StyleProps = {
  className?: string;
  fill?: string;
  height?: number;
  inverted?: boolean;
  opacity?: number;
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
          ? theme.colors.icons.inverted
          : theme.colors.icons.base
    };
  `}

  ${({ inverted, stroke, theme, useStroke }) =>
    useStroke &&
    `
    stroke: ${
      typeof stroke !== 'undefined' && stroke !== null
        ? stroke
        : inverted
          ? theme.colors.icons.inverted
          : theme.colors.icons.base
    };
  `}
`;

export default icons;
