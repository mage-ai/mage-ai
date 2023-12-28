import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XLARGE } from '@oracle/styles/units/borders';
import { FONT_FAMILY_MEDIUM } from '@oracle/styles/fonts/primary';
import { ItemRowClassNameEnum } from './constants';
import { LARGE } from '@oracle/styles/fonts/sizes';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH, ScrollbarStyledCss, hideScrollBar } from '@oracle/styles/scrollbars';

export const COMPONENT_UUID = 'command-center';

export const APPLICATION_FOOTER_ID = `${COMPONENT_UUID}-application-footer`;
export const FOOTER_ID = `${COMPONENT_UUID}-footer`;
export const HEADER_ID = `${COMPONENT_UUID}-header`;
export const ITEMS_CONTAINER_UUID = `${COMPONENT_UUID}-items-container`;
export const ITEM_CONTEXT_CONTAINER_ID = `${COMPONENT_UUID}-item-context-container`;
export const MAIN_TEXT_INPUT_ID = `${COMPONENT_UUID}-main-text-input`;

export const MAX_WIDTH = 100 * UNIT;
const HEADER_CONTENT_HEIGHT = 5 * UNIT;
const FOOTER_CONTENT_HEIGHT = 5.5 * UNIT;

const SHARED_HIDDEN_STYLES = css`
  bottom: 0;
  opacity: 0;
  position: fixed;
  right: 0;
  visibility: hidden;
  z-index: -1;
`;

export const ContainerStyle = styled.div<{
  className?: string;
}>`
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
  height: ${HEADER_CONTENT_HEIGHT + (SCROLLBAR_WIDTH * 2)}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme || dark).monotone.grey500};
  `}
`;

export const InputStyle = styled.input`
  ${LARGE}

  &.active {
    ${SHARED_HIDDEN_STYLES}
  }

  background: none;
  border: none;
  font-family: ${FONT_FAMILY_MEDIUM};
  height: ${HEADER_CONTENT_HEIGHT}px;
  padding: ${1 * UNIT}px;
  width: 100%;

  ${props => `
    color: ${(props.theme || dark).content.active};
  `}
`;

const SHARED_CONTAINER_STYLES = css`
  ${ScrollbarStyledCss}
  ${hideScrollBar()}

  height: ${50 * UNIT}px;
  overflow: auto;
  margin: ${SCROLLBAR_WIDTH}px;

  &.inactive:hover {
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

export const ItemsContainerStyle = styled.div`
  ${SHARED_CONTAINER_STYLES}

  &.active {
    ${SHARED_HIDDEN_STYLES}
  }
`;

export const ApplicationContainerStyle = styled.div`
  ${SHARED_CONTAINER_STYLES}

  &.inactive {
    ${SHARED_HIDDEN_STYLES}
  }
`;

export const HeaderStyle = styled.div`
  align-items: center;
  display: flex;
  height: ${HEADER_CONTENT_HEIGHT}px;

  &.inactive {
    ${SHARED_HIDDEN_STYLES}
  }
`;

const FOOTER_STYLES = css`
  align-items: center;
  display: flex;
  height: ${FOOTER_CONTENT_HEIGHT}px;
  padding-left: ${SCROLLBAR_WIDTH + UNIT}px;
  padding-right: ${SCROLLBAR_WIDTH + UNIT}px;

  ${props => `
    background-color: ${(props.theme || dark)?.background?.row};
  `}
`;

export const FooterStyle = styled.div`
  ${FOOTER_STYLES}

  &.active {
    ${SHARED_HIDDEN_STYLES}
  }
`;

export const ApplicationFooterStyle = styled.div`
  ${FOOTER_STYLES}

  &.inactive {
    ${SHARED_HIDDEN_STYLES}
  }
`;
