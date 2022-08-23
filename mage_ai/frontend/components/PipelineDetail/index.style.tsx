import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { hideScrollBar } from '@oracle/styles/scrollbars';


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
  height: ${ASIDE_HEADER_HEIGHT}px;
  position: sticky;
  top: ${ASIDE_HEADER_HEIGHT}px;
  width: 100%;
  z-index: 5;
  overflow: auto;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  ${hideScrollBar()}
`;

export const FileTabStyle = styled.div<{
  selected: boolean;
}>`
  border-left: 1px solid transparent;
  height: 100%;
  padding: ${UNIT}px ${PADDING_UNITS * UNIT}px;

  ${props => `
    &:hover {
      cursor: default;

      p {
        color: ${(props.theme.content || dark.content).active} !important;
        cursor: default;
      }
    }
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
  `}

  ${props => !props.selected && `
    border-color: ${(props.theme.borders || dark.borders).light} !important;
  `}
`;
