import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

export const SectionStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).popup};
  `}
`;

export const CodeEditorStyle = styled.div`
  padding-top: ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;

export const TableContainerStyle = styled.div`
  overflow: auto;
  max-height: 90vh;

  ${ScrollbarStyledCss}
`;
