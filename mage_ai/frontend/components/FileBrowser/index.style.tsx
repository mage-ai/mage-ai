import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = UNIT * 1.5;
export const INDENT_WIDTH = (ICON_SIZE * 1) + (UNIT / 2);
export const FOLDER_LINE_CLASSNAME = 'folder-vertical-line-indicator';

export const ContainerStyle = styled.div`
  // This allows the rows to have full width when highlighting them.

  display: inline-block;
  min-width: 100%;

  .row:hover, .row.highlighted {
    ${props => `
      background-color: ${(props.theme.interactive || dark.interactive).hoverBlackBackgroundTransparent};
    `}

    p {
      ${props => `
        color: ${(props.theme.content || dark.content).active} !important;
      `}
    }

    .${FOLDER_LINE_CLASSNAME} {
      ${props => `
        border-color: ${(props.theme.interactive || dark.interactive).hoverBlackBackgroundTransparent} !important;
      `}
    }
  }
`;
