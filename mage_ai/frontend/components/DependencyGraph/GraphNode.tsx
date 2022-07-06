import { ThemeContext } from 'styled-components';
import { useContext } from 'react';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import { INVERTED_TEXT_COLOR_BLOCK_TYPES, MIN_NODE_WIDTH } from './constants';
import { NodeStyle } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { getNodeColor } from './utils';

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
    type,
    uuid,
  } = block;

  return (
    <NodeStyle
      backgroundColor={getNodeColor(type, themeContext)}
      disabled={disabled}
      key={uuid}
      selected={selected}
    >
      <Button
        basic
        disabled={disabled}
        id={uuid}
        minWidth={MIN_NODE_WIDTH}
        noBackground
        noBorder
        onClick={(onClick && !disabled) ? () => onClick(block) : null}
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
