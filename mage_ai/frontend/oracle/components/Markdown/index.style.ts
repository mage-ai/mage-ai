import styled from 'styled-components';

import { FONT_FAMILY_REGULAR, FONT_FAMILY_BOLD } from '@oracle/styles/fonts/primary';
import { PADDING_HORIZONTAL, UNIT } from '@oracle/styles/units/spacing';
import { BORDER_WIDTH, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { REGULAR as REGULAR_FONT } from '@oracle/styles/fonts/sizes';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import dark from '@oracle/styles/themes/dark';

const VERTICAL_MARGIN = '0.75em';

export const MarkdownContainer = styled.div`
  font-family: ${FONT_FAMILY_REGULAR};
  margin: 0 ${UNIT}px;
  overflow: auto;
  ${ScrollbarStyledCss}

  ${props => `
    color: ${(props.theme || dark).content.active};
  `}

  p {
    margin: 0.5em 0;
  }

  blockquote {
    margin: ${VERTICAL_MARGIN} 0;
    padding: ${UNIT}px 0;

    ${props => `
      border-left: ${UNIT * 0.5}px solid ${(props.theme || dark).content.active};
    `}
  }

  blockquote:before {
    content: '';
    font-size: ${PADDING_HORIZONTAL * 3}px;
    line-height: 0.1em;
    margin-right: 0.25em;
    vertical-align: -0.4em;
  }

  blockquote p {
    display: inline;
  }

  pre {
    border-radius: ${BORDER_RADIUS_SMALL}px;
    white-space: pre;
    margin: ${VERTICAL_MARGIN} 0;
    padding: ${UNIT}px;
    overflow-x: auto;
    ${ScrollbarStyledCss}
    
    ${props => `
      background-color: ${(props.theme || dark).interactive.defaultBorder};
    `}

    span {
      padding: 0;
    }
  }

  ul, ol {
    margin-bottom: ${VERTICAL_MARGIN};
    padding-left: ${UNIT * 3}px;
  }
  
  li {
    ${REGULAR_FONT}
  }

  li > input[type='checkbox'] {
    pointer-events: none;
  }

  table {
    ${REGULAR_FONT}
    margin: ${VERTICAL_MARGIN};

    thead {
      font-family: ${FONT_FAMILY_BOLD};
      ${props => `
        border-bottom: ${BORDER_WIDTH}px solid ${(props.theme || dark).content.active};
      `}
    }

    th, td {
      padding: ${UNIT * 0.5}px ${UNIT * 0.75}px;
      ${props => `
        border: ${BORDER_WIDTH}px solid ${(props.theme || dark).content.muted};
      `}
    }
  }
`;
