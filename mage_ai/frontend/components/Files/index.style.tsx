import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { ALL_HEADERS_HEIGHT } from '@components/TripleLayout/index.style';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { hideScrollBar } from '@oracle/styles/scrollbars';

const MENU_HEIGHT = 36;
const TAB_HEIGHT = 36;
export const HEADER_HEIGHT_TOTAL = MENU_HEIGHT + TAB_HEIGHT;
export const MAIN_CONTENT_TOP_OFFSET = (HEADER_HEIGHT_TOTAL - ALL_HEADERS_HEIGHT) + HEADER_HEIGHT;

export const HeaderStyle = styled.div`
  height: ${HEADER_HEIGHT_TOTAL}px;
  top: ${HEADER_HEIGHT}px;
  z-index: 3;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeArea};
  `}
`;

export const MenuStyle = styled.div`
  // height: ${MENU_HEIGHT}px;
  position: relative;
  z-index: 1;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export const TabsStyle = styled.div`
  ${hideScrollBar()}

  height: ${TAB_HEIGHT}px;
  overflow-x: auto;
  position: sticky;
  width: 100%;
  z-index: 0;
`;

export const SearchContainerStyle = styled.div`
  margin: ${UNIT}px;
  margin-right: 0;
  // position: fixed;
  // width: 100%;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;
