import React, { useState } from 'react';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Flex from '@oracle/components/Flex';
import MageIcon from '@oracle/icons/custom/Mage8Bit';
import Text from '@oracle/elements/Text';
import { Add, Close } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  WindowContainerStyle,
  WindowContentStyle,
  WindowFooterStyle,
  WindowHeaderStyle,
} from './index.style';

type RecommendationsWindowProps = {
  blockInsertionIndex?: number;
  blocks: BlockType[];
  children?: JSX.Element;
  selectedBlock: BlockType;
  setRecsWindowOpenBlockIdx: (idx: number) => void;
  setSelectedBlock: (block: BlockType) => void;
};

function RecommendationsWindow({
  blockInsertionIndex,
  blocks = [],
  children,
  selectedBlock,
  setRecsWindowOpenBlockIdx,
  setSelectedBlock,
}: RecommendationsWindowProps) {
  const recsCount = React.Children.count(children);
  const finalBlockInsertionIdx = typeof blockInsertionIndex === 'undefined'
    ? blocks.length
    : blockInsertionIndex;
  const emptyMessage = selectedBlock === null
    ? 'Select a block to view data cleaning recommendations.'
    : 'No recommendations available.';

  return (
    <WindowContainerStyle>
      <WindowHeaderStyle>
        <Flex alignItems="center">
          <div>
            <MageIcon />
          </div>
          <Spacing pr={1} />
          <Text
            disableWordBreak
            monospace
          >
            Recommendations:
          </Text>
          <Select
            borderless
            compact
            label="Select block"
            monospace
            onChange={e => {
              const newBlockUuid = e.target.value;
              const newBlock = blocks.find(({ uuid }) => uuid === newBlockUuid);
              setSelectedBlock(newBlock);
            }}
            value={selectedBlock?.uuid}
          >
            {blocks.map(({ uuid }) => (
              <option key={uuid} value={uuid}>
                {uuid}
              </option>
            ))}
          </Select>
        </Flex>
        <Button
          iconOnly
          onClick={() => setRecsWindowOpenBlockIdx(null)}
        >
          <Close muted />
        </Button>
      </WindowHeaderStyle>

      <WindowContentStyle>
        {recsCount === 0
          ? 
            <Text>
              {emptyMessage}
            </Text>
          : children
        }
      </WindowContentStyle>

      <WindowFooterStyle>
        <Text default monospace>
          {recsCount} results
        </Text>
        <Button
          beforeIcon={<Add size={UNIT * 2} />}
          secondaryGradient
        >
          <Text>
            Add selected
          </Text>
        </Button>
      </WindowFooterStyle>
    </WindowContainerStyle>
  );
}

export default RecommendationsWindow;
