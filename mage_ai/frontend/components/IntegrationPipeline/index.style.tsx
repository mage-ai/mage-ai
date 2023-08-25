import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_WIDTH, BORDER_RADIUS, BORDER_STYLE } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

export const SectionStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).popup};
  `}
`;

// targeting a nested Markdown element with inline images that can be large
export const DocsStyle = styled.div`
  > div {
    overflow: initial;
  }
  > div img {
    max-width: 80%;
    background: white;
    padding: 1rem;
    max-height: 20vh;
  }
`;

export const CodeEditorStyle = styled.div`
  padding-top: ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;

export const TableContainerStyle = styled.div<{
  height?: string;
  hideHorizontalScrollbar?: boolean;
  maxHeight?: string;
  width?: string;
}>`
  overflow: auto;
  max-height: 90vh;
  width: 100%;
  ${ScrollbarStyledCss}

  ${props => props.hideHorizontalScrollbar && `
    overflow-x: hidden;
  `}

  ${props => props.width && `
    width: ${props.width};
  `}

  ${props => props.height && `
    height: ${props.height};
  `}

  ${props => props.maxHeight && `
    max-height: ${props.maxHeight};
  `}
`;

export const HeaderRowStyle = styled.div<{
  padding?: number;
  rounded?: boolean;
}>`
  padding: ${UNIT * 2}px;

  ${props => `
    background-color: ${(props.theme || dark).interactive.defaultBackground};
    border-bottom: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.medium};
  `}

  ${props => props.padding && `
    padding: ${props.padding}px;
  `}

  ${props => props.rounded && `
    border-top-left-radius: ${BORDER_RADIUS}px;
    border-top-right-radius: ${BORDER_RADIUS}px;
  `}
`;
