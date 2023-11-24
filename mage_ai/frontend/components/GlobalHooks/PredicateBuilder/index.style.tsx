import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { REGULAR_LINE_HEIGHT } from '@oracle/styles/fonts/sizes';

const CIRCLE_WIDTH = 1.25 * UNIT;
const LABEL_BORDER_WIDTH = 1;
const LABEL_PADDING_HORIZONTAL = 1.5 * UNIT;
const LABEL_PADDING_VERTICAL = UNIT / 4;
const LINE_WIDTH = 0.75 * UNIT;
const OPERATOR_PADDING_HORIZONTAL = UNIT / 2;

type SharedBackgroundProps = {
  default?: boolean;
};

const SHARED_BACKGROUND_STYLES = css<SharedBackgroundProps>`
  ${props => !props.default && `
    background-color: ${(props.theme.accent || dark.accent).purple};
  `}

  ${props => props.default && `
    background-color: ${(props.theme.content || dark.content).muted};
  `}
`;

export const LabelStyle = styled.div`
  border-radius: 100px;
  padding: ${LABEL_PADDING_VERTICAL}px ${LABEL_PADDING_HORIZONTAL}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).chartBlock};
    border: ${LABEL_BORDER_WIDTH}px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}
`;

export const CircleStyle = styled.div<SharedBackgroundProps>`
  ${SHARED_BACKGROUND_STYLES};

  border-radius: ${1.25 * UNIT}px;
  height: ${CIRCLE_WIDTH}px;
  width: ${CIRCLE_WIDTH}px;

  ${props => `
    border: 1px solid ${(props.theme.interactive || dark.interactive).hoverBorder};
  `}
`;

export const OperatorStyle = styled.div<{
  last?: boolean;
} & SharedBackgroundProps>`
  ${SHARED_BACKGROUND_STYLES};

  min-width: ${CIRCLE_WIDTH + ((LABEL_BORDER_WIDTH + LABEL_PADDING_HORIZONTAL) * 2)}px;
  padding-bottom: ${UNIT / 4}px;
  padding-left: ${OPERATOR_PADDING_HORIZONTAL}px;
  padding-right: ${OPERATOR_PADDING_HORIZONTAL}px;
  padding-top: ${(UNIT / 4) + 1}px;
`;

export const VerticalLineStyle = styled.div<{
  last?: boolean;
} & SharedBackgroundProps>`
  ${SHARED_BACKGROUND_STYLES};

  width: ${LINE_WIDTH}px;
  margin-right: ${(((LABEL_PADDING_HORIZONTAL) + LABEL_BORDER_WIDTH) + (CIRCLE_WIDTH / 2)) - (LINE_WIDTH / 2)}px;

  ${props => props.last && `
    height: calc(50% - ${LABEL_PADDING_VERTICAL + 1 + (REGULAR_LINE_HEIGHT / 2)}px);
  `}

  ${props => !props.last && `
    height: 100%;
  `}
`;
