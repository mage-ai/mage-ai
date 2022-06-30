import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export function getColorsForBlockType(blockType: BlockTypeEnum, props) {
  let accent = (props.theme.borders || dark.borders).light;

  if (BlockTypeEnum.TRANSFORMER === blockType) {
    accent = (props.theme.accent || dark.accent).purple;
  } else if (BlockTypeEnum.DATA_LOADER === blockType) {
    accent = (props.theme.accent || dark.accent).blue;
  } else if (BlockTypeEnum.SCRATCHPAD === blockType) {
    accent = (props.theme.content || dark.content).muted;
  }

  return {
    accent
  };
}


type ContainerProps = {
  blockType: BlockTypeEnum;
  selected: boolean;
};

export const ContainerStyle = styled.div<ContainerProps>`
  border-radius: ${BORDER_RADIUS}px;
  border: 2px solid transparent;
  overflow: hidden;

  ${props => props.selected && `
    border-color: ${getColorsForBlockType(props.blockType, props).accent};
  `}
`;

export const CodeContainerStyle = styled.div`
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
