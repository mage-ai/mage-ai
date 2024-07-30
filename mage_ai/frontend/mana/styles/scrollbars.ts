import styled, { css } from 'styled-components';

import { transition } from '../styles/mixins';

export type ScrollbarsStyledProps = {
  flexbox?: boolean;
  hideX?: boolean;
  hideXscrollbar?: boolean;
  hideY?: boolean;
  hideYscrollbar?: boolean;
  nested?: boolean;
  showX?: boolean;
  showY?: boolean;
  style?: React.CSSProperties;
};

const base = css<ScrollbarsStyledProps>`
  height: inherit;

  ${({
    hideX, hideY, showX, showY,
  }) => `
    overflow-x: ${hideX ? 'hidden' : showX ? 'scroll' : 'auto'};
    overflow-y: ${hideY ? 'hidden' : showY ? 'scroll' : 'auto'};
  `}

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

  ${({ hideYscrollbar }) =>
    hideYscrollbar &&
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
    nested,
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

      background: ${background['thumb' + (nested ? 'Nested' : '')].default};
      border-radius: ${border.radius.thumb};
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${background['thumb' + (nested ? 'Nested' : '')].hover};
    }

    ::-webkit-scrollbar-corner {
      background: ${background['track' + (nested ? 'Nested' : '')].default};
    }

    ::-webkit-scrollbar-track {
      background: ${background['track' + (nested ? 'Nested' : '')].default};
      border-radius: ${border.radius.track};
    }

    ::-webkit-scrollbar-track:hover {
      background: ${background['track' + (nested ? 'Nested' : '')].hover};
    }
  `}
`;

export const InnerStyled = styled.div``;

export default base;
