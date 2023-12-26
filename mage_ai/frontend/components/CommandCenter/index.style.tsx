import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XLARGE } from '@oracle/styles/units/borders';
import { FONT_FAMILY_MEDIUM } from '@oracle/styles/fonts/primary';
import { ItemRowClassNameEnum } from './constants';
import { LARGE } from '@oracle/styles/fonts/sizes';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH, ScrollbarStyledCss, hideScrollBar } from '@oracle/styles/scrollbars';

export const MAX_WIDTH = 100 * UNIT;

export const ContainerStyle = styled.div`
  backdrop-filter: saturate(140%) blur(${3 * UNIT}px);
  border-radius: ${BORDER_RADIUS_XLARGE}px;
  left: 50%;
  overflow: hidden;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);
  width: ${MAX_WIDTH}px;

  ${props => `
    background-color: ${(props.theme || dark).background.panelTransparent};
    box-shadow: ${(props.theme || dark).shadow.window};
    border: 1px solid ${(props.theme || dark).monotone.grey500};
  `}

  &.hide {
    bottom: 100%;
    opacity: 0;
    right: 100%;
  }
`;

export const InputContainerStyle = styled.div`
  padding: ${SCROLLBAR_WIDTH}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme || dark).monotone.grey500};
  `}
`;

export const InputStyle = styled.input`
  ${LARGE}

  background: none;
  border: none;
  font-family: ${FONT_FAMILY_MEDIUM};
  padding: ${1 * UNIT}px;
  width: 100%;

  ${props => `
    color: ${(props.theme || dark).content.active};
  `}
`;

export const ItemsContainerStyle = styled.div<{
  hideScrollBar?: boolean;
}>`
  ${ScrollbarStyledCss}
  ${hideScrollBar()}

  height: ${50 * UNIT}px;
  overflow: auto;
  margin: ${SCROLLBAR_WIDTH}px;

  &:hover {
    margin-right: 0;

    // for Internet Explorer, Edge
    -ms-overflow-style: block !important;
    // for Firefox
    scrollbar-width: block !important;
    // for Chrome, Safari, and Opera
    ::-webkit-scrollbar {
      display: block !important;
    }
  }

  ${props => `
    .${ItemRowClassNameEnum.ITEM_ROW} {
      &:hover {
        background-color: ${(props.theme || dark)?.interactive?.defaultBackgroundTransparent};
      }

      &.focused {
        background-color: ${(props.theme || dark)?.interactive?.hoverBackgroundTransparent};

        &:hover {
          background-color: ${(props.theme || dark)?.interactive?.hoverBackgroundTransparent};
        }
      }
    }
  `}
`;
