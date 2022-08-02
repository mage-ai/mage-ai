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
  setRecommendationsWindowOpen: (open: boolean) => void;
  setSelectedBlock: (block: BlockType) => void;
};

function RecommendationsWindow({
  blockInsertionIndex,
  blocks = [],
  children,
  selectedBlock,
  setRecommendationsWindowOpen,
  setSelectedBlock,
}: RecommendationsWindowProps) {
  const recsCount = React.Children.count(children);

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
            fullWidth
            label="Select a block"
            monospace
            onChange={e => {
              const newBlockUuid = e.target.value;
              const newBlock = blocks.find(({ uuid }) => uuid === newBlockUuid);
              setSelectedBlock(newBlock);
            }}
            value={selectedBlock?.name}
          >
            {blocks.map(({ name, uuid }) => (
              <option key={uuid} value={uuid}>
                {name}
              </option>
            ))}
          </Select>
        </Flex>
        <Button
          iconOnly
          onClick={() => setRecommendationsWindowOpen(false)}
        >
          <Close muted />
        </Button>
      </WindowHeaderStyle>

      <WindowContentStyle>
        {recsCount === 0
          ? 
            <Text>
              No recommendations available
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
