import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_STYLE, BORDER_WIDTH } from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const MenuStyle = styled.div`
  ${ScrollbarStyledCss};

  border-radius: ${BORDER_RADIUS}px;
  max-height: ${60 * UNIT}px;
  min-width: ${70 * UNIT}px;
  overflow: auto;
  position: absolute;
  right: 0;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}
`;
