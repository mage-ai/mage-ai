import React, { useContext, useMemo } from 'react';
import { ThemeContext } from 'styled-components';
import { useDrag, useDrop } from 'react-dnd';

import Badge from '@oracle/components/Badge';
import BlockType, {
  ABBREV_BLOCK_LANGUAGE_MAPPING,
  BLOCK_TYPE_NAME_MAPPING,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { DRAG_AND_DROP_TYPE } from '../constants';
import { FileFill, PreviewOpen } from '@oracle/icons';
import {
  HiddenBlockContainerStyle,
  getColorsForBlockType,
} from '../index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { buildBorderProps } from '../utils';
import { useDynamicUpstreamBlocks } from '@utils/models/block';

type HiddenBlockProps = {
  block: BlockType;
  blocks: BlockType[];
  onClick: () => void;
  onDrop?: (block: BlockType, blockDropped: BlockType) => void;
};

function HiddenBlock({
  block,
  blocks,
  onClick,
  onDrop,
}: HiddenBlockProps, ref) {
  const {
    type,
  } = block;

  const [collected, drag, dragPreview] = useDrag(() => ({
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    item: block,
    type: DRAG_AND_DROP_TYPE,
  }), [block]);
  const [, drop] = useDrop(() => ({
    accept: DRAG_AND_DROP_TYPE,
    drop: (item: BlockType) => onDrop?.(block, item),
  }), [block]);

  const themeContext = useContext(ThemeContext);

  const color = getColorsForBlockType(
    type,
    {
      blockColor: block.color,
      theme: themeContext,
    },
  ).accent;

  const {
    dynamic,
    dynamicUpstreamBlock,
    reduceOutput,
    reduceOutputUpstreamBlock,
  } = useDynamicUpstreamBlocks([block], blocks)[0];

  const {
    borderColorShareProps,
    // @ts-ignore
  } = useMemo(() => buildBorderProps({
    block,
    dynamic,
    dynamicUpstreamBlock,
    reduceOutput,
    reduceOutputUpstreamBlock,
  }), [
    block,
    dynamic,
    dynamicUpstreamBlock,
    reduceOutput,
    reduceOutputUpstreamBlock,
  ]);

  const isDBT = useMemo(() => BlockTypeEnum.DBT === block?.type, [block]);

  return (
    <Spacing pb={1} ref={drop}>
      <HiddenBlockContainerStyle
        {...{
          ...borderColorShareProps,
          ...collected,
        }}
        ref={drag}
      >
        <Link
          noHoverUnderline
          noOutline
          onClick={() => onClick()}
          preventDefault
          ref={ref}
        >
          <Spacing p={1}>
            <FlexContainer
              alignItems="center"
              justifyContent="space-between"
            >
              <Flex alignItems="center" flex={1}>
                <FlexContainer alignItems="center">
                  <Badge monospace>
                    {ABBREV_BLOCK_LANGUAGE_MAPPING[block.language]}
                  </Badge>

                  <Spacing mr={1} />

                  <Circle
                    color={color}
                    size={UNIT * 1.5}
                    square
                  />

                  <Spacing mr={1} />

                  <Text
                    color={color}
                    monospace
                  >
                    {(
                      isDBT
                        ? BlockTypeEnum.DBT
                        : BLOCK_TYPE_NAME_MAPPING[block.type]
                    )?.toUpperCase()}
                  </Text>
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <FileFill size={UNIT * 1.5} />

                <Spacing mr={1} />

                <Text monospace muted>
                  {block?.uuid}
                </Text>
              </Flex>

              <Tooltip
                appearAbove
                appearBefore
                block
                label={`Show ${block?.uuid} block`}
                size={UNIT * 2}
                widthFitContent
              >
                <PreviewOpen muted size={UNIT * 2} />
              </Tooltip>
            </FlexContainer>
          </Spacing>
        </Link>
      </HiddenBlockContainerStyle>
    </Spacing>
  );
}

export default React.forwardRef(HiddenBlock);
