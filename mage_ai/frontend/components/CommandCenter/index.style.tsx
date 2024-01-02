import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XLARGE } from '@oracle/styles/units/borders';
import { FONT_FAMILY_MEDIUM } from '@oracle/styles/fonts/primary';
import { ITEM_ROW_HEIGHT, MAX_WIDTH } from './ItemRow/index.style';
import { ItemRowClassNameEnum } from './constants';
import { LARGE } from '@oracle/styles/fonts/sizes';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH, ScrollbarStyledCss, hideScrollBar } from '@oracle/styles/scrollbars';

export const COMPONENT_UUID = 'command-center';

export const APPLICATION_FOOTER_ID = `${COMPONENT_UUID}-application-footer`;
export const FOOTER_ID = `${COMPONENT_UUID}-footer`;
export const HEADER_ID = `${COMPONENT_UUID}-header`;
export const HEADER_TITLE_ID = `${COMPONENT_UUID}-header-title`;
export const ITEMS_CONTAINER_UUID = `${COMPONENT_UUID}-items-container`;
export const ITEM_CONTEXT_CONTAINER_ID = `${COMPONENT_UUID}-item-context-container`;
export const MAIN_TEXT_INPUT_ID = `${COMPONENT_UUID}-main-text-input`;
export const INPUT_CONTAINER_ID = `${COMPONENT_UUID}-input-container`;

export const SHARED_PADDING = SCROLLBAR_WIDTH;
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
  width: ${MAX_WIDTH + (1 * 2)}px;
  z-index: 100;

  ${props => `
    background-color: ${(props.theme || dark).background.dashboard};
    box-shadow: ${(props.theme || dark).shadow.window};
    border: 1px solid ${(props.theme || dark).monotone.grey400};

    #${INPUT_CONTAINER_ID} {
      border-bottom: 1px solid ${(props.theme || dark).monotone.grey400};
    }

    &.version_control {
      border: 1px solid ${(props.theme || dark).accent.negativeTransparent};

      #${INPUT_CONTAINER_ID} {
        border-bottom: 1px solid ${(props.theme || dark).accent.negativeTransparent};
      }
    }
  `}

  &.hide {
    bottom: 100%;
    opacity: 0;
    right: 100%;
  }
`;

export const InputContainerStyle = styled.div`
  height: ${HEADER_CONTENT_HEIGHT + (SCROLLBAR_WIDTH * 2)}px;
`;

export const HeaderContainerStyle = styled.div`
  align-items: center;
  display: flex;
  padding: ${SCROLLBAR_WIDTH}px;
`;

export const LoadingStyle = styled.div`
  position: absolute;
  width: 100%;

  &.inactive {
    ${SHARED_HIDDEN_STYLES}
  }
`;

export const InputStyle = styled.input`
  ${LARGE}

  &.active {
    ${SHARED_HIDDEN_STYLES}
  }

  background: none;
  border: none;
  display: flex;
  flex: 99;
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

  height: ${(ITEM_ROW_HEIGHT * 9) + (SHARED_PADDING * 2)}px;
  overflow: auto;
  max-width: ${MAX_WIDTH}px;

  &.inactive:hover {
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

  padding-bottom: ${SCROLLBAR_WIDTH}px;
  padding-top: ${SCROLLBAR_WIDTH}px;

  &.active {
    ${SHARED_HIDDEN_STYLES}
  }
`;

export const ApplicationContainerStyle = styled.div`
  ${SHARED_CONTAINER_STYLES}

  &.inactive {
    ${SHARED_HIDDEN_STYLES}
  }

  &:hover {
    // for Internet Explorer, Edge
    -ms-overflow-style: block !important;
    // for Firefox
    scrollbar-width: block !important;
    // for Chrome, Safari, and Opera
    ::-webkit-scrollbar {
      display: block !important;
    }
  }
`;

export const ApplicationContentStyle = styled.div`
  left: ${SCROLLBAR_WIDTH}px;
  max-width: ${MAX_WIDTH - (SCROLLBAR_WIDTH * 2)}px;
  padding-bottom: ${1 * UNIT}px;
  padding-top: ${1 * UNIT}px;
  position: relative;
`;

export const HeaderStyle = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  flex-shrink: 0;
  height: ${HEADER_CONTENT_HEIGHT}px;
  white-space: nowrap;

  &.inactive {
    ${SHARED_HIDDEN_STYLES}
  }

  #${HEADER_TITLE_ID}.inactive {
    ${SHARED_HIDDEN_STYLES}
  }
`;

export const HeaderTitleStyle = styled.div`
  flex: 1;
  position: relative;
`;

export const HeaderSubtitleStyle = styled.div`
`;

export const FooterWraperStyle = styled.div`
  position: relative;
`;

const FOOTER_STYLES = css`
  align-items: center;
  display: flex;
  height: ${FOOTER_CONTENT_HEIGHT}px;
  padding-left: ${SCROLLBAR_WIDTH + UNIT}px;
  padding-right: ${SCROLLBAR_WIDTH + UNIT}px;

  ${props => `
    background-color: ${(props.theme || dark)?.background?.panelTransparent};
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

export const KeyboardShortcutStyle = styled.div`
  position: absolute;
  right: ${UNIT + SCROLLBAR_WIDTH}px;

  &.active {
    ${SHARED_HIDDEN_STYLES}
  }
`;
