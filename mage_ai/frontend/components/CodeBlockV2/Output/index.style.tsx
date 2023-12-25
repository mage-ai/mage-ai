import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_WIDTH_THICK } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  BORDER_COLOR_SHARED_STYLES,
  BorderColorShareProps,
} from '@components/CodeBlock//index.style';

export const SubheaderMenuStyle = styled.div<{
  top: number;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-left-style: solid;
  border-left-width: ${BORDER_WIDTH_THICK}px;
  border-right-style: solid;
  border-right-width: ${BORDER_WIDTH_THICK}px;
  position: sticky;
  z-index: 9;

  ${props => `
    background-color: ${(props.theme || dark).background.dashboard};
    top: ${props.top + BORDER_WIDTH_THICK}px;
  `}
`;
