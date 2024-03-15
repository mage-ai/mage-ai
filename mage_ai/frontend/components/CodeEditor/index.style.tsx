import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';

export const NUMBER_OF_BUFFER_LINES = 2;
export const SINGLE_LINE_HEIGHT = 21;

export const ContainerStyle = styled.div<{
  hideDuplicateMenuItems?: boolean;
  padding?: number;
}>`
  font-family: ${FONT_FAMILY_REGULAR};

  .context-view.monaco-menu-container {
    background-color: ${dark.monotone.grey300};
  }

  ${props => (typeof props.padding === 'number' && props.padding > 0) && `
    // padding-top: ${props.padding}px;
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => props.hideDuplicateMenuItems && `
    /*
     * The (n + 10) assumes a specific number of items in the block editor context
     * menu. This includes "Run selected block", "Change All Occurrences", "Cut",
     * "Copy", "Paste", "Command Palette", and 3 dividers. The 10th item from the
     * bottom and higher are hidden to avoid duplicate shortcut items in the
     * context menu.
     */
    .monaco-menu li.action-item:nth-last-child(n + 10) {
      display: none;
    }
  `}
`;

export const PlaceholderStyle = styled.div`
  padding-left: 67px;
  position: absolute;
  z-index: 1;
`;
