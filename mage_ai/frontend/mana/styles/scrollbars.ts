import styled, { css } from 'styled-components';

import { transition } from '../styles/mixins';

export type ScrollbarsStyledProps = {
  flexbox?: boolean;
  hideXscrollbar?: boolean;
  showY?: boolean;
  style?: React.CSSProperties;
};

const base = css<ScrollbarsStyledProps>`
  height: inherit;
  overflow-x: auto;
  overflow-y: auto;

  ${({ hideXscrollbar }) =>
    hideXscrollbar &&
    `
    // for Internet Explorer, Edge
    -ms-overflow-style: none;
    // for Firefox
    scrollbar-width: none;
    // for Chrome, Safari, and Opera
    ::-webkit-scrollbar {
      display: none;
    }
  `}

  ${({
    theme: {
      scrollbars: { background, border, width },
    },
  }) => `
    ::-webkit-scrollbar {
      height: ${width.track}px;
      width: ${width.track}px;
    }

    ::-webkit-scrollbar-track {
    }

    ::-webkit-scrollbar-thumb {
      ${transition}

      background: ${background.thumb.default};
      border-radius: ${border.radius.thumb};
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${background.thumb.hover};
    }

    ::-webkit-scrollbar-corner {
      background: ${background.track.default};
    }

    ::-webkit-scrollbar-track {
      background: ${background.track.default};
      border-radius: ${border.radius.track};
    }

    ::-webkit-scrollbar-track:hover {
      background: ${background.track.hover};
    }
  `}

  ${({ showY }) => showY && `
    overflow-y: visible;
  `}
`;

export const InnerStyled = styled.div``;

export default base;
