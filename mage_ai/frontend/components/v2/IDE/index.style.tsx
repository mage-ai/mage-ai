import styled from 'styled-components';

type StyleProps = {
  hideDuplicateMenuItems?: boolean;
};

export const IDEStyled = styled.div<StyleProps>`
  background-color: green;
  font-family: ${({ theme }) => theme.fonts.family.monospace.regular};

  .context-view.monaco-menu-container {
    background-color: red;
  }

  ${({ hideDuplicateMenuItems }) => hideDuplicateMenuItems && `
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
