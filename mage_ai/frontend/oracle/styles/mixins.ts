import light from './themes/light';
import { BORDER_RADIUS_SMALL } from './units/borders';
import { OUTLINE_WIDTH } from './units/borders';

export const browser = (property, value) => `
  -webkit-${property}: ${value};
  -moz-${property}: ${value};
  -ms-${property}: ${value};
  ${property}: ${value};
`;

export const transition = (val = '0.1s all linear') => browser('transition', val);

export const gradient = (angle, startColor, endColor) => `
  background-image: -webkit-linear-gradient(
    ${angle},
    ${startColor} 0%,
    ${endColor} 100%
  );
  background-image: -moz-linear-gradient(
    ${angle},
    ${startColor} 0%,
    ${endColor} 100%
  );
  background-image: -o-linear-gradient(
    ${angle},
    ${startColor} 0%,
    ${endColor} 100%
  );
  background-image: linear-gradient(
    ${angle},
    ${startColor} 0%,
    ${endColor} 100%
  );
`;

export const outline = (props, opts: any = {}) => {
  const { borderRadius } = opts;

  return `
    &:active {
      box-shadow: none !important;
    }

    &:focus {
      ${borderRadius ? `border-radius: ${BORDER_RADIUS_SMALL}px` : ''};
      box-shadow: 0 0 0 ${OUTLINE_WIDTH}px ${(props.theme.interactive || light.interactive).focusBorder} inset;
    }
  `;
};
