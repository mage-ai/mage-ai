import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { UNIT } from '@oracle/styles/units/spacing';

export const BEFORE_WIDTH = 34 * UNIT;

export const BeforeStyle = styled.div`
  min-height: calc(100vh - ${HEADER_HEIGHT}px);
`;
