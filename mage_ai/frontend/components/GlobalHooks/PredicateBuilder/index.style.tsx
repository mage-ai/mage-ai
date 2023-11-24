import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { REGULAR_LINE_HEIGHT } from '@oracle/styles/fonts/sizes';
import { transition } from '@oracle/styles/mixins';

const CIRCLE_WIDTH = 1.25 * UNIT;
const LABEL_BORDER_WIDTH = 1;
const LABEL_PADDING_HORIZONTAL = 1.5 * UNIT;
const LABEL_PADDING_VERTICAL = UNIT / 4;
const LINE_WIDTH = 0.75 * UNIT;

export const LabelStyle = styled.div`
  border-radius: 100px;
  padding: ${LABEL_PADDING_VERTICAL}px ${LABEL_PADDING_HORIZONTAL}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).chartBlock};
    border: ${LABEL_BORDER_WIDTH}px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}
`;

export const CircleStyle = styled.div`
  border-radius: ${1.25 * UNIT}px;
  height: ${CIRCLE_WIDTH}px;
  width: ${CIRCLE_WIDTH}px;

  ${props => `
    background-color: ${(props.theme.accent || dark.accent).purple};
    border: 1px solid ${(props.theme.interactive || dark.interactive).hoverBorder};
  `}
`;

export const OperatorStyle = styled.div`
  padding: ${UNIT / 4}px 0;
  width: ${CIRCLE_WIDTH + ((LABEL_BORDER_WIDTH + LABEL_PADDING_HORIZONTAL) * 2)}px;

  ${props => `
    background-color: ${(props.theme.accent || dark.accent).purple};
  `}
`;

export const VerticalLineStyle = styled.div<{
  last?: boolean;
}>`
  width: ${LINE_WIDTH}px;
  margin-right: ${(((LABEL_PADDING_HORIZONTAL) + LABEL_BORDER_WIDTH) + (CIRCLE_WIDTH / 2)) - (LINE_WIDTH / 2)}px;

  ${props => `
    background-color: ${(props.theme.accent || dark.accent).purple};
  `}

  ${props => props.last && `
    height: calc(50% - ${LABEL_PADDING_VERTICAL + 1 + (REGULAR_LINE_HEIGHT / 2)}px);
  `}

  ${props => !props.last && `
    height: 100%;
  `}
`;
