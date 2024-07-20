import styled, { css } from 'styled-components';
import { UNIT } from '../../themes/spaces';
import { gradientBackground } from '../../styles/mixins';
import scrollbars from '../../styles/scrollbars';
import { motion } from 'framer-motion';

const DIVIDER_SPACE = 2;
export const MENU_ITEM_HEIGHT = 35;
export const MENU_MIN_WIDTH = UNIT * 40;

type MenuStyledProps = {
  contained?: string;
  left?: number;
  noHover?: string;
  top?: number;
  zIndex?: number;
};

const borderStyles = css`
  border-left: 1px solid var(--colors-graymd);
  border-right: 1px solid var(--colors-graymd);
`;

const hoveredBackground = css<{
  noHover?: string;
}>`
  ${({ noHover }) =>
    !noHover &&
    `
    background-color: var(--colors-graymd);
    border-left-color: var(--colors-gray);
    border-right-color: var(--colors-gray);
  `}
`;

const focusedBackground = css`
  ${hoveredBackground}
`;

const activeBackground = css`
  background-color: var(--colors-graylo);
  border-left-color: var(--colors-gray);
  border-right-color: var(--colors-gray);
`;

const hovered = css<{
  noHover?: string;
}>`
  ${({ noHover }) =>
    !noHover &&
    `
    border-bottom-color: var(--colors-gray);
    border-top-color: var(--colors-gray);
  `}
`;

export const MenuStyled = styled(motion.div)<MenuStyledProps>`
  ${({ left, top, zIndex }) =>
    (typeof left !== 'undefined' || typeof top !== 'undefined') &&
    `
    left: ${left}px;
    top: ${top}px;
    z-index: ${zIndex || 1};
  `}

  max-height: 100vh;
  min-width: ${MENU_MIN_WIDTH}px;
  overflow: hidden;
  position: fixed;
  width: max-content;

  &:hover {
    cursor: default;
  }
`;

export const MenuContent = styled(motion.nav)`
  ${scrollbars}
  max-height: inherit;
  overflow-y: auto;

  ${({ theme }) => `
    backdrop-filter: ${theme.menus.blur.base};
    border-radius: ${theme.menus.border.radius.base};
  `}

  ${gradientBackground('0deg', '#0000004D', '#0000004D', 0, 100, 'graylo')}
`;

export const MenuContentScroll = styled(motion.div)`
`;

export const MenuItemContainerStyled = styled.div<{
  contained?: boolean;
  first?: boolean;
  last?: boolean;
  noHover?: string;
  onMouseEnter?: (event: any) => void;
  onMouseLeave?: (event: any) => void;
}>`
  ${borderStyles}

  overflow: hidden;

  ${({ first, theme }) =>
    first &&
    `
    border-top: 1px solid var(--colors-graymd);
    border-top-left-radius: ${theme.menus.border.radius.base};
    border-top-right-radius: ${theme.menus.border.radius.base};
  `}

  ${({ last, theme }) =>
    last &&
    `
    border-bottom: 1px solid var(--colors-graymd);
    border-bottom-left-radius: ${theme.menus.border.radius.base};
    border-bottom-right-radius: ${theme.menus.border.radius.base};
  `}

  &.focusing {
    ${focusedBackground}
  }

  &.activated {
    ${activeBackground}
  }

  &.hovering {
    ${hoveredBackground}
  }

  &:hover {
    ${hoveredBackground}
  }

  a {
    &:hover {
      cursor: default;
    }
  }
`;

export const ItemContent = styled.div<{
  first?: boolean;
  last?: boolean;
  noHover?: string;
}>`
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;

  &:hover {
    ${hovered}
  }

  ${({ first }) =>
    first &&
    `
    margin-top: ${DIVIDER_SPACE}px;

    &:hover {
      border-top-color: transparent;
    }
  `}

  ${({ last }) =>
    last &&
    `
    margin-bottom: ${DIVIDER_SPACE}px;

    &:hover {
      border-bottom-color: transparent;
    }
  `}
`;

export const MenuItemStyled = styled.div`
  ${({ theme }) => `
    padding: ${theme.menus.padding.item.base};
  `}
`;

export const DividerContainer = styled.div`
  ${borderStyles}
  ${({ theme }) => `
    padding-left: ${theme.menus.padding.item.base};
    padding-right: ${theme.menus.padding.item.base};
  `}
`;

export const DividerStyled = styled.div`
  background-color: var(--colors-graymd);
  height: 1px;
  margin-bottom: ${DIVIDER_SPACE}px;
  margin-top: ${DIVIDER_SPACE}px;
  margin-left: 16px;
  margin-right: 16px;
`;
