import styled from 'styled-components';

import { COLUMN_HEADER_CHART_HEIGHT } from '@components/datasets/overview/utils';
import { REGULAR_LINE_HEIGHT } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

const ASIDE_HEADER_HEIGHT = UNIT * 6;
const SCROLLBAR_HEIGHT = UNIT * 2;
export const TOTAL_PADDING = UNIT * 4;
export const TABLE_COLUMN_HEADER_HEIGHT = COLUMN_HEADER_CHART_HEIGHT + (UNIT * 3) + REGULAR_LINE_HEIGHT

export const ContainerStyle = styled.div`
  padding: ${UNIT * 2}px;
  height: calc(100vh - ${ASIDE_HEADER_HEIGHT}px - ${SCROLLBAR_HEIGHT}px);
  width: fit-content;
`;
