import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { ROW_GROUP_CLASS_NAME, ROW_GROUP_HEADER_CLASS_NAME } from './Output';
import { SCROLLBAR_WIDTH_SMALL, PlainScrollbarStyledCss, hideScrollBar, showScrollBar } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

const CONTAINER_STYLE = css`
  ${PlainScrollbarStyledCss}

  &.active-group {
    overflow: auto;

    &:first-child {
      ${props => `
        border-bottom: 1px solid ${(props.theme.borders || dark.borders).light};
      `}
    }

    .${ROW_GROUP_CLASS_NAME} {
      border: none;

      .${ROW_GROUP_HEADER_CLASS_NAME} {
        backdrop-filter: saturate(140%) blur(${3 * UNIT}px);

        ${props => `
          background-color: ${(props.theme || dark)?.background?.blackTransparent};
        `}
      }
    }
  }
`;

const CONTENT_STYLE = css`
`;


export const ShellContainerStyle = styled.div`
  ${CONTAINER_STYLE}

  ${hideScrollBar}

  height: 500px;
  position: relative;
  background: black;
  width: inherit;
  overflow: auto;
`;

export const OutputContainerStyle = styled.div`
  ${CONTAINER_STYLE}
`;

export const ShellContentStyle = styled.div`
  ${CONTENT_STYLE}
`;

export const OutputContentStyle = styled.div`
  ${CONTENT_STYLE}
`;

