import { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const SCROLLBAR_WIDTH = UNIT * 1.5;

export const ScrollbarStyledCss = css<{
  scrollbarBorderRadiusLarge?: boolean;
}>`
  ${props => `
    ::-webkit-scrollbar {
      width: ${SCROLLBAR_WIDTH}px;
    }

    ::-webkit-scrollbar-track {
    }

    ::-webkit-scrollbar-thumb {
      ${transition()}

      background: ${(props.theme.background || dark.background).scrollbarThumb};
      border-radius: ${BORDER_RADIUS}px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${(props.theme.background || dark.background).scrollbarThumbHover};
    }
    ::-webkit-scrollbar-corner {
      background: ${(props.theme.background || dark.background).scrollbarTrack};
    }
  `}

  ${props => !props.scrollbarBorderRadiusLarge && `
    ::-webkit-scrollbar-track {
      background: ${(props.theme.background || dark.background).scrollbarTrack};
    }
  `}

  ${props => props.scrollbarBorderRadiusLarge && `
    ::-webkit-scrollbar {
      border-radius: ${BORDER_RADIUS_LARGE}px !important;
    }

    ::-webkit-scrollbar-track {
      border-radius: ${BORDER_RADIUS_LARGE}px !important;
    }

    ::-webkit-scrollbar-thumb {
      border-radius: ${BORDER_RADIUS_LARGE}px !important;
    }
  `}
`;
