import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_WIDTH_THICK } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  BORDER_COLOR_SHARED_STYLES,
  BorderColorShareProps,
} from '@components/CodeBlock//index.style';

export const SubheaderMenuStyle = styled.div<{
  top?: number;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-left-style: solid;
  border-left-width: ${BORDER_WIDTH_THICK}px;
  border-right-style: solid;
  border-right-width: ${BORDER_WIDTH_THICK}px;

  // Can’t get the flyout menu in the header to appear above this sticky element.
  // position: sticky;
  // z-index: 8;

  ${props => `
    background-color: ${(props.theme || dark).background.dashboard};
    top: ${props.top + BORDER_WIDTH_THICK}px;
  `}
`;

export const WrapperStyle = styled.div<{
  borderBottom?: boolean;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-left-style: solid;
  border-left-width: ${BORDER_WIDTH_THICK}px;
  border-right-style: solid;
  border-right-width: ${BORDER_WIDTH_THICK}px;
  min-height: ${UNIT * 5}px;
  overflow: hidden;

  ${props => `
    background-color: ${(props.theme || dark).background.codeArea};
  `}

  ${props => props.borderBottom && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
    border-bottom-style: solid;
    border-bottom-width: ${BORDER_WIDTH_THICK}px;
  `}
`;
