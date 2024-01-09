import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { hideScrollBar } from '@oracle/styles/scrollbars';

export const UNDERLINE_HEIGHT = 2;

export const TabsContainerStyle = styled.div<{
  allowScroll?: boolean;
  noPadding?: boolean;
}>`
  ${hideScrollBar()}

  padding-left: ${PADDING_UNITS * UNIT}px;
  padding-right: ${PADDING_UNITS * UNIT}px;

  ${props => props.noPadding && `
    padding: 0;
  `}

  ${props => props.allowScroll && `
    overflow: auto;
  `}

  ${ScrollbarStyledCss}
`;


export const SelectedUnderlineStyle = styled.div<{
  backgroundColor?: string;
  backgroundColorPrimary?: boolean;
  selected?: boolean;
}>`
  border-radius: 6px;
  height: ${UNDERLINE_HEIGHT}px;

  ${props => !props.selected && `
    background-color: transparent;
  `}

  ${props => props.selected && !props.backgroundColor && `
    background-color: ${(props.theme || dark)?.accent?.blue};
  `}

  ${props => props.selected && props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}
`;
