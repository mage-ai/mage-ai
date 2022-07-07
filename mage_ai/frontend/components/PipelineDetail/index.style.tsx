import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const ANIMATION_DURATION = 300;

export const PipelineContainerStyle = styled.div`
  .pipeline-detail-enter-active {
    opacity: 1;
    transition: opacity ${ANIMATION_DURATION}ms linear;
  }

  .pipeline-detail-enter-done {
    opacity: 0;
    transition: opacity ${ANIMATION_DURATION}ms linear;
  }
`;

export const OverlayStyle = styled.div`
  height: 100vh;
  opacity: 1;
  position: fixed;
  width: 100vw;
  z-index: 9999;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeArea};
  `}
`;

export const PipelineHeaderStyle = styled.div`
  height: ${UNIT * 6}px;
  padding-left: ${PADDING_UNITS * UNIT}px;
  padding-right: ${PADDING_UNITS * UNIT}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;
