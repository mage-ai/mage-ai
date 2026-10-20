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

export const StreamSectionStyle = styled.div<{
  noBorderRadius?: boolean;
}>`
  overflow: hidden;

  ${props => `
    background-color: ${(props.theme.background || dark.background).content};
  `}

  ${props => !props.noBorderRadius && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
  `}
`;

export const EmptyCodeSpace = styled.div`
  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;

export const CalloutStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border: 1px solid ${(props.theme.borders || dark.borders).light};
  `}
`;
