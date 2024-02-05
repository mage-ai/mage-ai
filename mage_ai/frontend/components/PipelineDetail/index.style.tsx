import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { hideScrollBar } from '@oracle/styles/scrollbars';

export const ANIMATION_DURATION = 300;
const TABS_HEADER_HEIGHT = 37;

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

export const PipelineHeaderStyle = styled.div<{
  relativePosition?: boolean;
  secondary?: boolean;
}>`
  height: ${ASIDE_HEADER_HEIGHT}px;
  position: sticky;
  top: ${ASIDE_HEADER_HEIGHT}px;
  width: 100%;
  z-index: 5;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => props.relativePosition && `
    position: relative;
  `}

  ${props => props.secondary && `
    height: ${TABS_HEADER_HEIGHT}px;
    top: ${ASIDE_HEADER_HEIGHT}px;
    overflow-x: auto;
    z-index: 3;
  `}

  ${hideScrollBar()}
`;

export const FileTabStyle = styled.div<{
  last?: boolean;
  selected?: boolean;
}>`
  border-right: 1px solid transparent;
  height: 100%;
  padding: ${1 * UNIT}px ${1.5 * UNIT}px;
  position: relative;

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
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => !props.selected && !props.last && `
    border-color: ${(props.theme.borders || dark.borders).light} !important;
  `}
`;

export const HeaderViewOptionsStyle = styled.div`
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
`;
