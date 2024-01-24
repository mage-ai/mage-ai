import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';;
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { SCROLLBAR_WIDTH, PlainScrollbarStyledCss, hideScrollBar } from '@oracle/styles/scrollbars';
import { BORDER_RADIUS_XLARGE } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildDefaultLayout } from '@storage/ApplicationManager/cache';
import { hexToRgb } from '@utils/string';
import { transition } from '@oracle/styles/mixins';

const SCALE_PERCENTAGE = 0.1;
export const HEADER_HEIGHT = 6 * UNIT;
export const OVERLAY_ID = 'application-minimized-overlay'
const RESIZE_SIZE = 1 * UNIT;
const RESIZE_SIZE_CORNER = 2 * UNIT;

function getRGBA(color: string, opts?: {
  transparency?: number;
}) {
  const {
    r,
    g,
    b,
  } = hexToRgb(color);

  return `rgba(${r}, ${g}, ${b}, ${opts?.transparency || 1})`;
}

export function getApplicationColors(uuid: ApplicationExpansionUUIDEnum, props: {
  theme?: any;
  transparency?: number;
} = {}): {
  accent: string;
  background: string;
  border: string;
} {
  let accent;
  let background;
  let border;

  if (ApplicationExpansionUUIDEnum.ArcaneLibrary === uuid) {
    accent = (props?.theme || dark)?.accent?.purple;
  } else if (ApplicationExpansionUUIDEnum.PortalTerminal === uuid) {
    accent = (props?.theme || dark)?.accent?.negative;
  } else if (ApplicationExpansionUUIDEnum.VersionControlFileDiffs === uuid) {
    accent = (props?.theme || dark)?.background?.success;
  }

  return {
    accent,
    background: background || getRGBA(accent, props),
    border: border || getRGBA(accent, {
      ...props,
      transparency: 0.3,
    }),
  };
}

function minimizedDimensions(): {
  height: number;
  width: number;
} {
  const {
    dimension: {
      height,
      width,
    },
  } = buildDefaultLayout()

  return {
    height: height * SCALE_PERCENTAGE,
    width: width * SCALE_PERCENTAGE,
  };
}

export const RootApplicationStyle = styled.div`
  ${Object.keys(ApplicationExpansionUUIDEnum).map((uuid: ApplicationExpansionUUIDEnum) => `
    #${uuid}.minimized {
      bottom: ${minimizedDimensions().height * 0.5}px;
      margin-left: 8px;
      margin-right: 8px;
      position: relative;
      height: ${minimizedDimensions().height}px;
      width: ${minimizedDimensions().width}px;
      z-index: 100;

      &:hover {
        ${transition()}
        transform: translateY(-38px);
      }

      .minimized {
        position: relative;
        border-radius: 120px;
        bottom: 0;
        box-shadow:
          0 0 0 8px #18181C,
          0 0 0 24px rgba(72, 119, 255, 0.3);
        transform: scale(${SCALE_PERCENTAGE});
        transform-origin: 0 0;

        &:hover {
          ${transition()}
          box-shadow:
            0 0 0 8px #18181C,
            0 0 0 32px #2A60FE;
          cursor: pointer;
        }

        .${OVERLAY_ID} {
          ${transition()}

          background-color: rgba(0, 0, 0, 0.3);
          bottom: 0;
          height 100%;
          left: 0;
          position: absolute;
          right: 0;
          width 100%;
          z-index: 11;

          &:hover {
            background-color: rgba(0, 0, 0, 0.0);
          }
        }
      }
    }
  `)}
`;

export const DockStyle = styled.div`
  ${transition()}

  bottom: 0;
  display: flex;
  height: 20px;
  justify-content: center;
  position: fixed;
  width: 100%;
  z-index: 10;

  // ${Object.keys(ApplicationExpansionUUIDEnum).map((uuid: ApplicationExpansionUUIDEnum) => `
  //   :has(#${uuid}.minimized) {
  //     &:hover {
  //       border-bottom: 40px solid rgba(0, 0, 0, 0.5);
  //       cursor: pointer;
  //       height: 130px;
  //     }
  //   }
  // `)}
`;

export const OverlayStyle = styled.div``;

export const ContainerStyle = styled.div`
  border-bottom-left-radius: ${BORDER_RADIUS_XLARGE}px;
  border-bottom-right-radius: ${BORDER_RADIUS_XLARGE}px;
  box-shadow: 0px 10px 60px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  position: fixed;
`;

export const ContentStyle = styled.div`
  ${PlainScrollbarStyledCss}
  // ${hideScrollBar()}

  overflow: auto;
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

  bottom: 0;
  height calc(100% - ${HEADER_HEIGHT}px);
  left: 0;
  position: absolute;
  right: 0;
  top: ${HEADER_HEIGHT}px;
  width 100%;
`;

export const HeaderStyle = styled.div`
  backdrop-filter: saturate(140%) blur(${3 * UNIT}px);
  background-color: rgb(0, 0, 0, 0.9);
  border-bottom: 1px solid #2E3036;
  border-top-left-radius: ${BORDER_RADIUS_XLARGE}px;
  border-top-right-radius: ${BORDER_RADIUS_XLARGE}px;
  height: ${HEADER_HEIGHT}px;
  position: fixed;
  width: inherit;
  z-index: 5;

  ${Object.keys(ApplicationExpansionUUIDEnum).map((uuid: ApplicationExpansionUUIDEnum) => `
    &#${uuid}-header {
      background-color: ${getApplicationColors(uuid, { transparency: 0.5 })?.background};
    }
  `)}
`;

export const InnerStyle = styled.div`
  backdrop-filter: saturate(140%) blur(${3 * UNIT}px);
  background-color: rgba(24, 24, 28, 0.95);
  bottom: 0;
  height 100%;
  left: 0;
  position: absolute;
  right: 0;
  top: 0px;
`;

const RESIZE_STYLES = css`
  background: transparent;
  position: absolute;
  z-index: 10;

  &:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }
`;

export const ResizeLeftStyle = styled.div`
  ${RESIZE_STYLES}

  bottom: ${RESIZE_SIZE_CORNER}px;
  left: 0;
  top: ${RESIZE_SIZE_CORNER}px;
  height: calc(100% - ${RESIZE_SIZE_CORNER * 2}px);
  width: ${RESIZE_SIZE}px;

  &:hover, &:active {
    cursor: col-resize;
  }
`;

export const ResizeRightStyle = styled.div`
  ${RESIZE_STYLES}

  bottom: ${RESIZE_SIZE_CORNER}px;
  right: 0;
  top: ${RESIZE_SIZE_CORNER}px;
  height: calc(100% - ${RESIZE_SIZE_CORNER * 2}px);
  width: ${RESIZE_SIZE}px;

  &:hover, &:active {
    cursor: col-resize;
  }
`;

export const ResizeTopStyle = styled.div`
  ${RESIZE_STYLES}

  left: ${RESIZE_SIZE_CORNER}px;
  right: 0;
  top: 0;
  height: ${RESIZE_SIZE}px;
  width: calc(100% - ${RESIZE_SIZE_CORNER * 2}px);

  &:hover, &:active {
    cursor: row-resize;
  }
`;

export const ResizeBottomStyle = styled.div`
  ${RESIZE_STYLES}

  bottom: 0;
  left: ${RESIZE_SIZE_CORNER}px;
  right: 0;
  height: ${RESIZE_SIZE}px;
  width: calc(100% - ${RESIZE_SIZE_CORNER * 2}px);

  &:hover, &:active {
    cursor: row-resize;
  }
`;

export const ResizeCornerStyle = styled.div<{
  bottom?: boolean,
  left?: boolean,
  right?: boolean,
  top?: boolean,
}>`
  ${RESIZE_STYLES}

  height: ${RESIZE_SIZE_CORNER}px;
  width: ${RESIZE_SIZE_CORNER}px;

  &:hover {
    background-color: transparent;
  }

  ${props => ((props.top && props.left) || (props.bottom && props.right)) && `
    &:hover, &:active {
      cursor: nwse-resize;
    }
  `}

  ${props => ((props.top && props.right) || (props.bottom && props.left)) && `
    &:hover, &:active {
      cursor: nesw-resize;
    }
  `}

  ${props => (props.top && props.left) &&`
    border-top-left-radius: ${BORDER_RADIUS_XLARGE}px;
  `}

  ${props => (props.top && props.right) &&`
    border-top-right-radius: ${BORDER_RADIUS_XLARGE}px;
  `}

  ${props => (props.bottom && props.left) &&`
    border-bottom-left-radius: ${BORDER_RADIUS_XLARGE}px;
  `}

  ${props => (props.bottom && props.right) &&`
    border-bottom-right-radius: ${BORDER_RADIUS_XLARGE}px;
  `}

  ${props => props.bottom && `
    bottom: 0;

    &:hover {
      border-bottom: ${RESIZE_SIZE}px solid rgba(0, 0, 0, 0.3);
    }
  `}

  ${props => props.left && `
    left: 0;

    &:hover {
      border-left: ${RESIZE_SIZE}px solid rgba(0, 0, 0, 0.3);
    }
  `}

  ${props => props.right && `
    right: 0;

    &:hover {
      border-right: ${RESIZE_SIZE}px solid rgba(0, 0, 0, 0.3);
    }
  `}

  ${props => props.top && `
    top: 0;

    &:hover {
      border-top: ${RESIZE_SIZE}px solid rgba(0, 0, 0, 0.3);
    }
  `}
`;

export const ButtonStyle = styled.div`
  .emtpy {
    display: none;
  }

  .filled {
    display: block;
  }
`;
