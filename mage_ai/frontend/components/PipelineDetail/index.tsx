import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import CodeBlock from '@components/CodeBlock';
import Spacing from '@oracle/elements/Spacing';
import usePrevious from '@utils/usePrevious';
import {
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_UP,
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { getNewUUID } from '@utils/string';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pushAtIndex } from '@utils/array';
import { useKeyboardContext } from '@context/Keyboard';

type PipelineDetailProps = {
  mainContainerRef: any;
};

function PipelineDetail({
  mainContainerRef,
}: PipelineDetailProps) {
  const [blocks, setBlocks] = useState<BlockType[]>([
    {
      type: BlockTypeEnum.DATA_LOADER,
      uuid: 'a',
    },
    {
      type: BlockTypeEnum.TRANSFORMER,
      uuid: 'b',
    },
  ]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const selectedBlockPrevious = usePrevious(selectedBlock);

  const numberOfBlocks = useMemo(() => blocks.length, [blocks]);
  const addNewBlockAtIndex = useCallback((block: BlockType, idx: number) => {
    const newBlock = {
      uuid: getNewUUID(),
      ...block,
    };
    const newBlocks = pushAtIndex(newBlock, idx, blocks);
    setBlocks(newBlocks);

    return newBlock;
  }, [
    blocks,
    setBlocks,
  ]);

  const uuidKeyboard = 'PipelineDetail/index';
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping, keyHistory) => {
      if (keyMapping[KEY_CODE_ESCAPE]) {
        if (textareaFocused) {
          setTextareaFocused(false);
        } else if (selectedBlock) {
          setSelectedBlock(null);
        }
      } else if (selectedBlock && !textareaFocused) {
        const selectedBlockIndex =
          blocks.findIndex(({ uuid }: BlockType) => selectedBlock.uuid === uuid);

        if (keyMapping[KEY_CODE_ARROW_UP] && selectedBlockIndex >= 1) {
          setSelectedBlock(blocks[selectedBlockIndex - 1]);
        } else if (keyMapping[KEY_CODE_ARROW_DOWN] && selectedBlockIndex <= numberOfBlocks - 2) {
          setSelectedBlock(blocks[selectedBlockIndex + 1]);
        } else if (keyMapping[KEY_CODE_ENTER]) {
          setTextareaFocused(true);
        }
      } else if (selectedBlockPrevious && !selectedBlock) {
        if (keyMapping[KEY_CODE_ENTER]) {
          setSelectedBlock(selectedBlockPrevious);
        }
      }
    },
    [
      blocks,
      numberOfBlocks,
      selectedBlock,
      setSelectedBlock,
      selectedBlockPrevious,
      setTextareaFocused,
      textareaFocused,
    ],
  );

  return (
    <Spacing p={PADDING_UNITS}>
      {blocks.map((block: BlockType, idx: number) => {
        const {
          uuid,
        } = block;
        const selected: boolean = selectedBlock?.uuid === uuid;

        return (
          <CodeBlock
            addNewBlock={(b: BlockType) => {
              setSelectedBlock(addNewBlockAtIndex(b, idx + 1));
              setTextareaFocused(true);
            }}
            block={block}
            key={uuid}
            mainContainerRef={mainContainerRef}
            noDivider={idx === numberOfBlocks - 1}
            selected={selected}
            setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
            setTextareaFocused={setTextareaFocused}
            textareaFocused={selected && textareaFocused}
          />
        );
      })}

      <Spacing mt={PADDING_UNITS}>
        <AddNewBlocks
          addNewBlock={(b: BlockType) => {
            setSelectedBlock(addNewBlockAtIndex(b, numberOfBlocks));
            setTextareaFocused(true);
          }}
        />
      </Spacing>
    </Spacing>
  );
}

export default PipelineDetail;
