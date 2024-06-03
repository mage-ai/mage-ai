import { css } from 'styled-components';

export const transition = css`
  transition: 0.2s all ease-in-out;
`;

export const gradient = (angle: number, startColor: string, endColor: string, startPercentage?: number, endPercentage?: number) => css`
  background-image: -webkit-linear-gradient(${angle}, ${startColor} ${startPercentage || 0}%, ${endColor} ${endPercentage || 100}%);
  background-image: -moz-linear-gradient(${angle}, ${startColor} ${startPercentage || 0}%, ${endColor} ${endPercentage || 100}%);
  background-image: -o-linear-gradient(${angle}, ${startColor} ${startPercentage || 0}%, ${endColor} ${endPercentage || 100}%);
  background-image: linear-gradient(${angle}, ${startColor} ${startPercentage || 0}%, ${endColor} ${endPercentage || 100}%);
`;

export const outlineHover = ({
  borderColor,
  outlineColor,
  outlineWidth,
}: {
  borderColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
}) => css`
  &:hover {
    box-shadow:
      0 0 0 ${({ theme }) => theme.borders.outline.offset}
        ${({ theme }) => borderColor || theme.colors.backgrounds.button.base},
      0 0 0
        ${({ theme }) =>
          !outlineWidth ? theme.borders.outline.width : String(outlineWidth) + 'px'}
        ${({ theme }) => outlineColor || theme.colors.purple};
  }

  &:focus {
    box-shadow:
      0 0 0 ${({ theme }) => theme.borders.outline.offset}
        ${({ theme }) => borderColor || theme.colors.backgrounds.button.base},
      0 0 0
        ${({ theme }) =>
          !outlineWidth ? theme.borders.outline.width : String(outlineWidth) + 'px'}
        ${({ theme }) => outlineColor || theme.colors.purple};
  }

  &:active {
    box-shadow: none;
  }
`;
