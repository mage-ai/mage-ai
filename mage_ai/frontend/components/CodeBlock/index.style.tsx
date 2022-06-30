import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

type ContainerProps = {
};

export const ContainerStyle = styled.div<ContainerProps>`
  border-radius: ${BORDER_RADIUS}px;
  padding-bottom: ${UNIT}px;
  padding-top: ${UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  .line-numbers {
    opacity: 0;
  }

  &.selected {
    .line-numbers {
      opacity: 1 !important;
    }
  }
`;

type BlockDividerProps = {
};

export const BlockDivider = styled.div<BlockDividerProps>`
  align-items: center;
  display: flex;
  height: ${UNIT * 1.5}px;
  justify-content: center;
  position: relative;

  &:hover {
    .block-divider-inner {
      ${props => `
        background-color: ${(props.theme.text || dark.text).fileBrowser};
      `}
    }
  }
`;

export const BlockDividerInner = styled.div`
  height 1px;
  width: 100%;
  position: absolute;
  z-index: -1;
`;
