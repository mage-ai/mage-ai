import { css } from 'styled-components';

export const transition = css`
  transition: 0.2s all ease-in-out;
`;

export const transitionFast = css`
  transition: 0.15s all linear;
`;

export const gradient = (
  angle: string,
  startColor: string,
  endColor: string,
  startPercentage?: number,
  endPercentage?: number,
) => css`
  background-image: -webkit-linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%
  );
  background-image: -moz-linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%
  );
  background-image: -o-linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%
  );
  background-image: linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%
  );
`;

export const gradientBackground = (
  angle: string,
  startColor: string,
  endColor: string,
  startPercentage?: number,
  endPercentage?: number,
  backgroundColorName?: string,
) => css`
  background: -webkit-linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%,
    var(--colors-${backgroundColorName || 'gray'})
  );
  background: -moz-linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%,
    var(--colors-${backgroundColorName || 'gray'})
  );
  background: -o-linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%,
    var(--colors-${backgroundColorName || 'gray'})
  );
  background: linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%,
    var(--colors-${backgroundColorName || 'gray'})
  );
`;

type OutlineHoverProps = {
  active?: boolean;
  borderColor?: string;
  outlineColor?: string;
  outlineOffset?: number;
  outlineWidth?: number;
};

export const outlineHover = ({
  active,
  borderColor,
  outlineColor,
  outlineOffset,
  outlineWidth,
}: OutlineHoverProps) => css`
  ${({ theme }) => `
    &:hover {
      box-shadow:
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0)}px
          ${borderColor || theme.colors.backgrounds.button.base},
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0) + theme.borders.outline.width + (outlineWidth || 0)}px
          ${outlineColor || theme.colors.purple};
    }

    &:focus {
      box-shadow:
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0)}px
          ${borderColor || theme.colors.backgrounds.button.base},
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0) + theme.borders.outline.width + (outlineWidth || 0)}px
          ${outlineColor || theme.colors.purple};
    }
  `}

  ${!active &&
  `
    &:active {
      box-shadow: none;
    }
  `}

  ${({ theme }) =>
    active &&
    `
    &:active {
      box-shadow:
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0)}px
          ${borderColor || theme.colors.backgrounds.button.base},
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0) + theme.borders.outline.width + (outlineWidth || 0)}px
          ${outlineColor || theme.colors.purple};
    }
  `}
`;
