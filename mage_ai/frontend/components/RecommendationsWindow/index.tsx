import React, { useState } from 'react';

import BlockType, { BlockTypeEnum, BlockRequestPayloadType } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import MageIcon from '@oracle/icons/custom/Mage8Bit';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import SuggestionType from '@interfaces/SuggestionType';
import Text from '@oracle/elements/Text';
import { Add, Close } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  WindowContainerStyle,
  WindowContentStyle,
  WindowFooterStyle,
  WindowHeaderStyle,
} from './index.style';
import { getUpstreamBlockUuids } from '@components/CodeBlock/utils';
import { addUnderscores, randomSimpleHashGenerator } from '@utils/string';


type RecommendationsWindowProps = {
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
  ) => Promise<any>;
  blockInsertionIndex?: number;
  blocks: BlockType[];
  children?: JSX.Element;
  loading: boolean;
  selectedBlock: BlockType;
  setRecsWindowOpenBlockIdx: (idx: number) => void;
  setSelectedBlock: (block: BlockType) => void;
  suggestions: SuggestionType[];
};

function RecommendationsWindow({
  addNewBlockAtIndex,
  blockInsertionIndex,
  blocks = [],
  children,
  loading,
  selectedBlock,
  setRecsWindowOpenBlockIdx,
  setSelectedBlock,
  suggestions,
}: RecommendationsWindowProps) {
  const [selectedRecIdx, setSelectedRecIdx] = useState<number>(null);
  const recsCount = React.Children.count(children);
  const finalBlockInsertionIdx = typeof blockInsertionIndex === 'undefined'
    ? blocks.length
    : blockInsertionIndex + 1;
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
            Recommendations:&nbsp;
          </Text>
          <Select
            compact
            label="Select block"
            monospace
            onChange={e => {
              const newBlockUuid = e.target.value;
              const newBlock = blocks.find(({ uuid }) => uuid === newBlockUuid);
              setSelectedBlock(newBlock);
              setSelectedRecIdx(null);
            }}
            value={selectedBlock?.uuid}
          >
            {blocks.map(({ uuid }) => (
              <option key={uuid} value={uuid}>
                {uuid}&nbsp;
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

      <WindowContentStyle
        minMaxHeight={recsCount === 0 }
      >
        {loading && <Spinner inverted />}
        {(!loading && recsCount === 0)
          ? 
            <Text>
              {emptyMessage}
            </Text>
          : React.Children.map(children, (
            recRow: JSX.Element,
            idx: number,
          ) => React.cloneElement(recRow, {
            key: idx,
            last: idx === recsCount - 1,
            onClick: () => setSelectedRecIdx(prevSelectedRecIdx => (
              idx === prevSelectedRecIdx ? null : idx),
            ),
            selected: idx === selectedRecIdx,
          }))
        }
      </WindowContentStyle>

      <WindowFooterStyle>
        <Text default monospace>
          {recsCount} results
        </Text>
        <Button
          beforeIcon={<Add size={UNIT * 2} />}
          disabled={selectedRecIdx === null}
          onClick={() => {
            const upstreamBlocks = getUpstreamBlockUuids(selectedBlock);
            const suggestedActionPayload: SuggestionType = suggestions?.[selectedRecIdx];
            const formattedSuggestionTitle = addUnderscores(suggestedActionPayload?.title || '').toLowerCase();
            const newBlockTitle = `${formattedSuggestionTitle}_${randomSimpleHashGenerator()}`;

            addNewBlockAtIndex({
              config: {
                suggested_action: {
                  ...suggestedActionPayload,
                },
              },
              name: newBlockTitle,
              type: BlockTypeEnum.TRANSFORMER,
              upstream_blocks: upstreamBlocks,
            }, finalBlockInsertionIdx, setSelectedBlock);
          }}
          secondaryGradient={selectedRecIdx !== null}
        >
          <Text>
            Add selected code block
          </Text>
        </Button>
      </WindowFooterStyle>
    </WindowContainerStyle>
  );
}

export default RecommendationsWindow;
