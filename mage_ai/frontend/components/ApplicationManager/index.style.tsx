import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';;
import { SCROLLBAR_WIDTH, ScrollbarStyledCss, hideScrollBar } from '@oracle/styles/scrollbars';


export const ContainerStyle = styled.div`
  position: fixed;
`;

export const ContentStyle = styled.div`
  ${ScrollbarStyledCss}
  ${hideScrollBar()}

  overflow: auto;
  &:hover {
    // for Internet Explorer, Edge
    -ms-overflow-style: block !important;
    // for Firefox
    scrollbar-width: block !important;
    // for Chrome, Safari, and Opera
    ::-webkit-scrollbar {
      display: block !important;
    }
  }

  bottom: 0;
  height 100%;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  width 100%;
`;

export const InnerStyle = styled.div`
  bottom: 0;
  height 100%;
  left: 0;
  margin-left: ${SCROLLBAR_WIDTH}px;
  position: absolute;
  right: ${SCROLLBAR_WIDTH}px;
  top: 0;

  &:hover {
    right: 0;
  }
`;

const RESIZE_STYLES = css`
  background: transparent;
  position: absolute;
  z-index: 10;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
`;

export const ResizeLeftStyle = styled.div`
  ${RESIZE_STYLES}

  bottom: 0;
  left: 0;
  top: 0;
  height: 100%;
  width: 20px;

  &:hover {
    cursor: col-resize;
  }
`;

export const ResizeRightStyle = styled.div`
  ${RESIZE_STYLES}

  bottom: 0;
  right: 0;
  top: 0;
  height: 100%;
  width: 20px;

  &:hover {
    cursor: col-resize;
  }
`;

export const ResizeTopStyle = styled.div`
  ${RESIZE_STYLES}

  left: 0;
  right: 0;
  top: 0;
  height: 20px;
  width: 100%;

  &:hover {
    cursor: row-resize;
  }
`;

export const ResizeBottomStyle = styled.div`
  ${RESIZE_STYLES}

  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  width: 100%;

  &:hover {
    cursor: row-resize;
  }
`;
