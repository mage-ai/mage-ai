import styled from 'styled-components';

import base, { StyleProps, baseFontFamily, monospaceFontFamily } from '../../styles/typography';
import borders from '../../styles/borders';

type MarkdownProps = any;

export type MarkdownType = {
  a?: MarkdownProps;
  blockquote?: MarkdownProps;
  br?: MarkdownProps;
  code?: MarkdownProps;
  del?: MarkdownProps;
  em?: MarkdownProps;
  h1?: MarkdownProps;
  h2?: MarkdownProps;
  h3?: MarkdownProps;
  h4?: MarkdownProps;
  h5?: MarkdownProps;
  hr?: MarkdownProps;
  img?: MarkdownProps;
  input?: MarkdownProps;
  li?: MarkdownProps;
  ol?: MarkdownProps;
  p?: MarkdownProps;
  pre?: MarkdownProps;
  span?: MarkdownProps;
  strong?: MarkdownProps;
  table?: MarkdownProps;
  tbody?: MarkdownProps;
  td?: MarkdownProps;
  th?: MarkdownProps;
  thead?: MarkdownProps;
  tr?: MarkdownProps;
  ul?: MarkdownProps;
};

export const MarkdownContainer = styled.div<MarkdownType>`
  overflow: auto;
  margin: 0;

  ${base}

  code {
    ${base}
    ${monospaceFontFamily}
    font-size: ${({ theme }) => theme.fonts.size.sm};
  }
  pre {
    ${base}
    ${monospaceFontFamily}
    font-size: ${({ theme }) => theme.fonts.size.sm};
  }
  span {
    ${base}
    ${monospaceFontFamily}
    font-size: ${({ theme }) => theme.fonts.size.sm};
  }

  p {
    margin: 0;
  }

  blockquote {
    margin: 0;
    padding: 0;

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
    border-radius: 0;
    white-space: pre;
    margin: 0;
    padding: 0;
    overflow-x: auto;

    span {
      padding: 0;
    }
  }

  ul,
  ol {
    margin-bottom: 0;
    padding-left: 0;
  }

  li > input[type='checkbox'] {
    pointer-events: none;
  }

  table {
    margin: 0;

    thead {
      border-bottom-color: var(--borders-color-base-default);
      border-bottom-style: var(--borders-style);
      border-bottom-width: var(--borders-width);
    }

    th,
    td {
      padding: 0;
    }
  }
`;
