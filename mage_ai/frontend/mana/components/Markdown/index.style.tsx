import styled from 'styled-components';

import { FONT_FAMILY_REGULAR, FONT_FAMILY_BOLD } from '@oracle/styles/fonts/primary';
import { PADDING_HORIZONTAL, UNIT } from '@oracle/styles/units/spacing';
import { BORDER_WIDTH, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { REGULAR as REGULAR_FONT } from '@oracle/styles/fonts/sizes';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import base from '../../styles/typography';
import borders from '../../styles/borders';

const VERTICAL_MARGIN = '0.75em';

export const MarkdownContainer = styled.div`
  font-family: ${FONT_FAMILY_REGULAR};
  margin: 0 ${UNIT}px;
  overflow: auto;
  ${ScrollbarStyledCss}

  ${base}

  p {
    margin: 0.5em 0;
  }

  blockquote {
    margin: ${VERTICAL_MARGIN} 0;
    padding: ${UNIT}px 0;

    border-left-color: var(--borders-color-base-default);
    border-left-style: var(--borders-style);
    border-left-width: var(--borders-width);
  }

  blockquote:before {
    content: '';
    font-size: var(--fonts-size-base);
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
      border-bottom-color: var(--borders-color-base-default);
      border-bottom-style: var(--borders-style);
      border-bottom-width: var(--borders-width);
    }

    th, td {
      padding: ${UNIT * 0.5}px ${UNIT * 0.75}px;
      ${borders}
    }
  }
`;
