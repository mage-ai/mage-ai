import React from 'react';
import styled from 'styled-components';

import { UNIT } from '@mana/themes/spaces';

export const MENU_ITEM_HEIGHT = 34;
export const MENU_MIN_WIDTH = UNIT * 70;

type MenuStyledProps = {
  contained?: boolean;
  left?: number;
  top?: number;
  zIndex?: number;
};

export const MenuStyled = styled.div<MenuStyledProps>`
  ${({ left, top, zIndex }) =>
    (typeof left !== 'undefined' || typeof top !== 'undefined') &&
    `
    left: ${left}px;
    top: ${top}px;
    z-index: ${zIndex || 1};
  `}

  ${({ contained, theme }) => `
    backdrop-filter: ${theme.menus.blur.base};
    background-color: ${theme.menus.background[contained ? 'contained' : 'base'].default};
    border-radius: ${theme.menus.border.radius.base};
    padding: ${theme.menus.padding.base};
  `}

  min-width: ${MENU_MIN_WIDTH}px;
  position: ${({ contained }) => (contained ? 'absolute' : 'fixed')};
`;
