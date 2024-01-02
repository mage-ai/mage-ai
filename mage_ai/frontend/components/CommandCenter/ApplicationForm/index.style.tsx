import styled from 'styled-components';

import { CONTAINER_HEIGHT } from '../index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { MAX_WIDTH } from '../ItemRow/index.style';

const CHILDREN_WIDTH_RATIO = 0.3;

export const ContainerStyle = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
`;

export const FormStyle = styled.div<{
  fullWidth?: boolean;
}>`
  position: relative;

  ${props => props.fullWidth && `
    width: 100%;
  `}

  ${props => !props.fullWidth && `
    left: ${MAX_WIDTH * CHILDREN_WIDTH_RATIO}px;
    width: ${MAX_WIDTH * (1 - CHILDREN_WIDTH_RATIO)}px;
  `}
`;

export const ChildrenStyle = styled.div`
  ${ScrollbarStyledCss}

  height: ${CONTAINER_HEIGHT}px;
  overflow: auto;
  position: fixed;
  width: ${MAX_WIDTH * CHILDREN_WIDTH_RATIO}px;
`;
