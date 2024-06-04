import styled from 'styled-components';

import { gradient } from '@mana/styles/mixins';

type StyleProps = {
  hideDuplicateMenuItems?: boolean;
};

export const ContainerStyled = styled.div`
  height: 100%;
  width: 100%;
`;

export const IDEStyled = styled.div<StyleProps>`
  background-color: black;

  &.mounted {
    ${gradient('45deg', '#6B50D7', '#FF144D', 30, 100)}
  }

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
