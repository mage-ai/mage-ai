import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';;
import { SCROLLBAR_WIDTH, ScrollbarStyledCss, hideScrollBar } from '@oracle/styles/scrollbars';


export const ContainerStyle = styled.div`
  ${ScrollbarStyledCss}
  // ${hideScrollBar()}

  overflow: auto;
  position: fixed;

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
`;

export const ContentStyle = styled.div`
  // left: ${SCROLLBAR_WIDTH}px;
  // margin-left: ${SCROLLBAR_WIDTH}px;
  // margin-right: ${SCROLLBAR_WIDTH}px;
  // position: absolute;
  // width: calc(100% - ${SCROLLBAR_WIDTH * 2}px);
`;
