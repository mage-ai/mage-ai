import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const CHART_HEIGHT_DEFAULT = UNIT * 40;

export const HeaderSectionStyle = styled.div`
  ${props => `
    background-color: ${(props.theme.background || dark.background).content};
  `}
`;

export const StreamSectionStyle = styled.div`
  border-bottom-left-radius: ${BORDER_RADIUS}px;
  border-bottom-right-radius: ${BORDER_RADIUS}px;
  overflow: hidden;

  ${props => `
    background-color: ${(props.theme.background || dark.background).content};
  `}
`;
