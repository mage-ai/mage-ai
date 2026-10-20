import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

import { UNIT } from '../../themes/spaces';
import { gradientBackground } from '../../styles/mixins';

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

const focusedBackground = css<{
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

const focused = css<{
  noHover?: string;
}>`
  ${({ noHover }) =>
    !noHover &&
    `
    border-bottom-color: var(--colors-gray);
    border-top-color: var(--colors-gray);
  `}
`;

export const MenuStyled = styled.div<MenuStyledProps>`
  ${({ left, top, zIndex }) =>
    (typeof left !== 'undefined' || typeof top !== 'undefined') &&
    `
    left: ${left}px;
    top: ${top}px;
    z-index: ${zIndex || 1};
  `}

  min-width: ${MENU_MIN_WIDTH}px;
  position: ${({ contained }) => (contained ? 'absolute' : 'fixed')};
  width: max-content;
`;

export const MenuContent = styled(motion.nav)`
  overflow: hidden;

  ${({ theme }) => `
    backdrop-filter: ${theme.menus.blur.base};
    border-radius: ${theme.menus.border.radius.base};
  `}

  ${gradientBackground('0deg', '#0000004D', '#0000004D', 0, 100, 'graylo')}
`;

export const MenuItemContainerStyled = styled.div<{
  contained?: boolean;
  first?: boolean;
  last?: boolean;
  noHover?: string;
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

  &:hover {
    ${focusedBackground}
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
    ${focused}
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
  margin-bottom: 2px;
  margin-top: 2px;
  margin-left: 16px;
  margin-right: 16px;
`;
