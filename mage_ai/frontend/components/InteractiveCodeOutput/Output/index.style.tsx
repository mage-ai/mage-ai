import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { LOADING_HEIGHT } from '@oracle/components/Loading';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR } from '@oracle/styles/fonts/sizes';
import { SCROLLBAR_WIDTH_SMALL, PlainScrollbarStyledCss, hideScrollBar, showScrollBar } from '@oracle/styles/scrollbars';
import { SHARED_STYLES } from '@components/shared/Table/index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const INDICATOR_SIZE = 3 * UNIT;
export const TOGGLE_CLASSNAME = 'output-row-toggle';
export const TOGGLE_SCROLLBAR_OFFSET_CLASS = 'toggle_scrollbar_offset';

const SHARED_HIDDEN_STYLES = css`
  bottom: 0;
  opacity: 0;
  position: fixed;
  right: 0;
  visibility: hidden;
  z-index: -1;
`;

export const RowGroupStyle = styled.div`
  ${transition()}
  padding-bottom: ${1 * UNIT}px;
  padding-top: ${1 * UNIT}px;

  .inactive {
    display: none;
  }

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  &.row-group-selected {
    ${props => `
      background-color: ${(props.theme || dark).accent.cyanTransparent};
      box-shadow:
        2px 1px 0 1px ${(props.theme || dark).accent.cyan} inset,
        -1px -1px 0 1px ${(props.theme || dark).accent.cyan} inset;
    `}
  }

  &.errors {
    ${props => `
      background-color: ${(props.theme || dark).accent.negativeTransparentMore};
    `}

    &.row-group-selected {
      ${props => `
        box-shadow:
          2px 1px 0 1px ${(props.theme || dark).accent.negative} inset,
          -1px -1px 0 1px ${(props.theme || dark).accent.negative} inset;
      `}


    // background: linear-gradient(58deg, rgba(255, 241, 244, 0.06), rgba(255, 241, 244, 0.06));
    // background-size: 400% 400%;
    // -webkit-animation: AnimationName 0s ease infinite;
    // -moz-animation: AnimationName 0s ease infinite;
    // animation: AnimationName 0s ease infinite;

    // @-webkit-keyframes AnimationName {
    //   0% {
    //     background-position:53% 0%
    //   };
    //   50% {
    //     background-position:48% 100%
    //   };
    //   100% {
    //     background-position:53% 0%
    //   };
    // }
    // @-moz-keyframes AnimationName {
    //   0% {
    //     background-position:53% 0%
    //   };
    //   50% {
    //     background-position:48% 100%
    //   };
    //   100% {
    //     background-position:53% 0%
    //   };
    // }
    // @keyframes AnimationName {
    //   0% {
    //     background-position:53% 0%
    //   };
    //   50% {
    //     background-position:48% 100%
    //   };
    //   100% {
    //     background-position:53% 0%
    //   };
    // }
  }
`;

export const LoadingStyle = styled.div<{
  inactive?: boolean;
}>`
  height: ${LOADING_HEIGHT}px;
  width: 100%;

  ${props => props.inactive && `
    display: none;
  `}
`;

export const HeaderStyle = styled.div`
  margin-bottom: ${UNIT}px;
  padding-left: ${UNIT}px;
  padding-right: ${UNIT}px;
`;

export const RowStyle = styled.div`
  ${PlainScrollbarStyledCss}
  // ${hideScrollBar}

  overflow: auto;
  // padding: ${UNIT}px;
  position: relative;
  transform: translateZ(0);
  width: 100%;

  &.has-scroll {
    .${TOGGLE_CLASSNAME} {
      display: block;
    }
  }

  code {
    width: inherit;
  }
`;

export const FloatingIndicatorStyle = styled.div`
  display: none;
  margin-bottom: auto;
  margin-top: auto;
  position: fixed;
  right: ${SCROLLBAR_WIDTH_SMALL * 2}px;
  top: calc(50% - ${INDICATOR_SIZE}px);
  z-index: 5;

  ${props => `
    box-shadow: ${(props.theme || dark).shadow.small};
  `}
`;

export const RowContentStyle = styled.div`
  margin-left: ${UNIT}px;
  margin-right: ${UNIT}px;
`;

export const HTMLOutputStyle = styled.div`
  table {
    ${REGULAR}

    font-family: ${MONO_FONT_FAMILY_REGULAR};
    contain: size;
    width: 100%;
    word-break: break-all;

    ${props => `
      border-collapse: separate;
    `}
  }

  tr {
    ${props => `
      &:hover {
        background: ${(props.theme.interactive || dark.interactive).rowHoverBackground};
      }
    `}
  }

  td, th {
    text-align: center !important;
    padding: 0 8px;

    ${props => `
      color: ${(props.theme.content || dark.content).active};
    `}
  }

  th {
    ${SHARED_STYLES}

    ${props => `
      border: 1px solid ${(props.theme.borders || dark.borders).light};
      border-right: none;
    `}

    &:last-child {
      ${props => `
        border-right: 1px solid ${(props.theme.borders || dark.borders).light};
      `}
    }
  }

  td {
    ${SHARED_STYLES}

    white-space: break-spaces;

    ${props => `
      border-left: 1px solid ${(props.theme.borders || dark.borders).light};
    `}

    &:last-child {
      ${props => `
        border-right: 1px solid ${(props.theme.borders || dark.borders).light};
      `}
    }
  }
`;
