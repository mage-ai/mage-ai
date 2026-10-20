import { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_LARGE, BORDER_RADIUS_PILL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const SCROLLBAR_WIDTH = UNIT * 1.25;
export const SCROLLBAR_WIDTH_SMALL = UNIT * 1;

export function hideScrollBar() {
  return `
    // for Internet Explorer, Edge
    -ms-overflow-style: none;
    // for Firefox
    scrollbar-width: none;
    // for Chrome, Safari, and Opera
    ::-webkit-scrollbar {
      display: none;
    }
  `;
}

export const ScrollbarStyledCss = css<{
  noScrollbarTrackBackground?: boolean;
  scrollbarBorderRadiusLarge?: boolean;
}>`
  ${props => `
    ::-webkit-scrollbar {
      height: ${SCROLLBAR_WIDTH}px;
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

  ${props => props.noScrollbarTrackBackground && `
    ::-webkit-scrollbar-corner {
      background: transparent;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
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

export const PlainScrollbarStyledCss = css<{
  noScrollbarTrackBackground?: boolean;
  scrollbarBorderRadiusLarge?: boolean;
}>`
  ::-webkit-scrollbar {
    height: ${SCROLLBAR_WIDTH_SMALL}px;
    width: ${SCROLLBAR_WIDTH_SMALL}px;
  }

  ::-webkit-scrollbar-corner {
    background: transparent;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar {
    border-radius: ${BORDER_RADIUS_PILL}px !important;
  }

  ::-webkit-scrollbar-track {
    border-radius: ${BORDER_RADIUS_PILL}px !important;
  }

  ${props => `
    ::-webkit-scrollbar-thumb {
      background: ${(props.theme.background || dark.background).scrollbarThumb};
      border-radius: ${BORDER_RADIUS_PILL}px !important;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: ${(props.theme.background || dark.background).scrollbarThumbHover};
      }
      ::-webkit-scrollbar-corner {
        background: ${(props.theme.background || dark.background).scrollbarTrack};
      }
    }
  `}
`;
