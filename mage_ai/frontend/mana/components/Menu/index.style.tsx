import styled, { css } from 'styled-components';
import { UNIT } from '../../themes/spaces';
import { gradientBackgroundVars } from '../../styles/mixins';
import scrollbars from '../../styles/scrollbars';
import { motion } from 'framer-motion';

export const DIVIDER_SPACE = 2;
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

  ${({ theme }) => `
    border-radius: var(--menus-border-radius-base);
    border-radius: var(--menus-border-radius-base);
    max-height: calc(100vh - (2px + ${theme.header.base.height}px));
    overflow: hidden;
  `}

  min-width: ${MENU_MIN_WIDTH}px;
  position: fixed;
  width: max-content;

  &:hover {
    cursor: default;
  }
`;

export const MenuContent = styled(motion.nav)`
  height: inherit;
  max-height: inherit;
  overflow: hidden;

  backdrop-filter: blur(var(--modal-blur-base));
  ${gradientBackgroundVars(
    '0deg',
    'var(--menus-background-gradient-default)',
    'var(--menus-background-gradient-default)',
    0,
    100,
    'var(--menus-background-base-default)'
  )}
`;

export const MenuContentScroll = styled(motion.div)`
  ${scrollbars}
  max-height: inherit;
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
    margin-top: var(--menus-border-radius-base);
  `}

  ${({ last, theme }) =>
    last &&
    `
    margin-bottom: var(--menus-border-radius-base);
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

export const BorderTop = styled.div`
  ${({ theme }) => `
    border-top-left-radius: var(--menus-border-radius-base);
    border-top-right-radius: var(--menus-border-radius-base);
    border-top: 1px solid var(--colors-graymd);
    border-left: 1px solid var(--colors-graymd);
    border-right: 1px solid var(--colors-graymd);
    top: 0;
    height: var(--menus-border-radius-base);
    overflow: hidden;
    position: fixed;
    width: 100%;
  `}
`;

export const BorderBottom = styled.div`
  ${({ theme }) => `

    border-bottom-left-radius: var(--menus-border-radius-base);
    border-bottom-right-radius: var(--menus-border-radius-base);
    border-bottom: 1px solid var(--colors-graymd);
    border-left: 1px solid var(--colors-graymd);
    border-right: 1px solid var(--colors-graymd);
    bottom: 0;
    height: var(--menus-border-radius-base);
    overflow: hidden;
    position: fixed;
    width: 100%;
  `}
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

    &:hover {
      border-top-color: transparent;
    }
  `}

  ${({ last }) =>
    last &&
    `

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
