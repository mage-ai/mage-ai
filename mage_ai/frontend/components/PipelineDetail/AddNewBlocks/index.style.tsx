import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

export const ICON_SIZE = PADDING_UNITS * UNIT;

type IconContainerProps = {
  blue?: boolean;
  border?: boolean;
  compact?: boolean;
  grey?: boolean;
  purple?: boolean;
  rose?: boolean;
  sky?: boolean;
  teal?: boolean;
  yellow?: boolean;
};

export const IconContainerStyle = styled.div<IconContainerProps>`
  align-items: center;
  border-radius: ${BORDER_RADIUS_SMALL}px;
  border: 1px solid transparent;
  display: flex;
  justify-content: center;

  ${props => props.border && `
    border: 1px dotted ${(props.theme.content || dark.content).active};
  `}

  ${props => props.grey && `
    background-color: ${getColorsForBlockType(BlockTypeEnum.SCRATCHPAD, props).accent};
  `}

  ${props => props.blue && `
    background-color: ${getColorsForBlockType(BlockTypeEnum.DATA_LOADER, props).accent};
  `}

  ${props => props.purple && `
    background-color: ${getColorsForBlockType(BlockTypeEnum.TRANSFORMER, props).accent};
  `}

  ${props => props.sky && `
    background-color: ${getColorsForBlockType(BlockTypeEnum.MARKDOWN, props).accent};
  `}

  ${props => props.teal && `
    background-color: ${getColorsForBlockType(BlockTypeEnum.EXTENSION, props).accent};
  `}

  ${props => props.rose && `
    background-color: ${getColorsForBlockType(BlockTypeEnum.CALLBACK, props).accent};
  `}

  ${props => props.yellow && `
    background-color: ${getColorsForBlockType(BlockTypeEnum.DATA_EXPORTER, props).accent};
  `}

  ${props => !props.compact && `
    height: ${ICON_SIZE + (UNIT / 2)}px;
    width: ${ICON_SIZE + (UNIT / 2)}px;
  `}

  ${props => props.compact && `
    height: ${(ICON_SIZE / 2) + (UNIT)}px;
    width: ${(ICON_SIZE / 2) + (UNIT)}px;
  `}
`;

export const ButtonWrapper = styled.div<{
  increasedZIndex?: boolean;
}>`
  position: relative;
  margin-bottom: ${UNIT}px;
  margin-right: ${UNIT}px;

  ${props => props.increasedZIndex && `
    z-index: 3;
  `}
`;
