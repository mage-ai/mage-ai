import styled from 'styled-components';

import { gradient } from '@mana/styles/mixins';

type StyleProps = {
  hideDuplicateMenuItems?: boolean;
};

export const ContainerStyled = styled.div<{
  ref: React.RefObject<HTMLDivElement>;
}>`
  height: 100%;
  overflow: hidden;
  width: 100%;

  &.mounted {
    .ide-container {
      ${gradient('45deg', '#6B50D71A', '#FF141A4D', 30, 100)}
    }

    .ide-loading {
      display: none;
    }
  }
`;

export const IDEStyled = styled.div<StyleProps>`
  background-color: ${({ theme }) => theme.ide.background.color.base};

  font-family: ${({ theme }) => theme.fonts.family.monospace.regular};

  // .context-view.monaco-menu-container {
  //   background-color: red;
  // }

  ${({ hideDuplicateMenuItems }) =>
    hideDuplicateMenuItems &&
    `
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
  `}// .myCustomLineDecoration {
  //   background-color: rgba(255, 0, 0, 0.3); /* Visible Red for Testing */
  //   border: 2px solid blue; /* Border to make it more visible */
  //   display: inline-block;
  //   width: 100%;
  //   height: 100%;
  // }

  // .debugGlyphMargin {
  //   background-color: rgba(0, 255, 0, 0.3); /* Visible Green for Testing */
  //   border: 2px solid yellow; /* Border to emphasize */
  //   display: inline-block;
  //   width: 100%;
  //   height: 100%;
  // }

  // #monaco-suggest-application-root {
  //   .monaco-modal {
  //     display: flex;
  //     position: fixed;
  //     z-index: 9999; /* Ensure the modal is above other content */
  //     left: 50%;
  //     top: 50%;
  //     transform: translate(-50%, -50%);
  //     width: 400px;
  //     background-color: white;
  //     border: 1px solid #888;
  //     box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  //     border-radius: 5px;
  //     overflow: visible;
  //     visibility: visible; /* Ensure it's not hidden */
  //     opacity: 1; /* Ensure it's fully opaque */
  //   }

  //   .monaco-modal-content {
  //     padding: 20px;
  //   }

  //   .monaco-modal-close {
  //     color: #aaa;
  //     float: right;
  //     font-size: 28px;
  //     font-weight: bold;
  //   }

  //   .monaco-modal-close:hover,
  //   .monaco-modal-close:focus {
  //     color: black;
  //     text-decoration: none;
  //     cursor: pointer;
  //   }
  // }
`;
