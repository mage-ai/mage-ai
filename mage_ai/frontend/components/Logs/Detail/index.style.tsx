import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';
import { SHARED_COLOR_STYLES } from '../index.style';

export const BarStyle = styled.div`
  ${SHARED_COLOR_STYLES}

  height: ${0.5 * UNIT}px;
  width: 100%;
`;

export const BadgeStyle = styled.div`
  ${SHARED_COLOR_STYLES}

  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: inline-block;
  padding: ${0.25 * UNIT}px ${0.5 * UNIT}px;
`;
