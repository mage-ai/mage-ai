import styled, { css } from 'styled-components';

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
    accent,
  };
}

export type BorderColorShareProps = {
  blockType: BlockTypeEnum;
  hasError?: boolean;
  selected: boolean;
};

export const BORDER_COLOR_SHARED_STYLES = css<BorderColorShareProps>`
  ${props => props.selected && !props.hasError && `
    border-color: ${getColorsForBlockType(props.blockType, props).accent};
  `}

  ${props => props.selected && props.hasError && `
    border-color: ${(props.theme.borders || dark.borders).danger};
  `}
`;

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  overflow: hidden;
  position: relative;
`;

export const CodeContainerStyle = styled.div<{
  hasOutput: boolean;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-left-style: solid;
  border-left-width: 2px;
  border-right-style: solid;
  border-right-width: 2px;
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  border-top-style: solid;
  border-top-width: 2px;
  padding-bottom: ${UNIT}px;
  padding-top: ${UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => !props.selected && !props.hasError && `
    border-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => !props.hasOutput && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
    border-bottom-style: solid;
    border-bottom-width: 2px;
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

export const BlockDivider = styled.div`
  align-items: center;
  display: flex;
  height: ${UNIT * 2}px;
  justify-content: center;
  position: relative;
  z-index: 1;

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
