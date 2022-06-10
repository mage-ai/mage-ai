import styled, { css } from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';


export const AceStyle = css<any>`
  // opacity: 0;
  cursorlayer {
    display: none;
  }

  ace_hidden-cursors {
    opacity: 0;
  }
`;

