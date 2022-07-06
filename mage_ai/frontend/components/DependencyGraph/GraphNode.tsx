import { ThemeContext } from 'styled-components';
import { useContext } from 'react';

import BlockType, { StatusTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import { Check } from '@oracle/icons';
import { INVERTED_TEXT_COLOR_BLOCK_TYPES, MIN_NODE_WIDTH } from './constants';
import { NodeStyle } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

type GraphNodeProps = {
  block: BlockType;
  disabled?: boolean;
  onClick?: (block: BlockType) => void;
  selected?: boolean;
};

function GraphNode({
  block,
  disabled,
  onClick,
  selected,
}: GraphNodeProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    status,
    type,
    uuid,
  } = block;

  return (
    <NodeStyle
      backgroundColor={getColorsForBlockType(type, { theme: themeContext }).accent}
      disabled={disabled}
      key={uuid}
      selected={selected}
    >
      <Button
        afterIcon={status === StatusTypeEnum.EXECUTED
          ? <Check size={UNIT * 2} success />
          : null
        }
        basic
        disabled={disabled}
        id={uuid}
        minWidth={MIN_NODE_WIDTH}
        noBackground
        noBorder
        onClick={(onClick && !disabled) ? () => onClick(block) : null}
        padding={`${UNIT}px`}
      >
        <Text
          inverted={INVERTED_TEXT_COLOR_BLOCK_TYPES.includes(type)}
          monospace
          small
        >
          {uuid}
        </Text>
      </Button>
    </NodeStyle>
  );
}

export default GraphNode;
