import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import BlockType from '@interfaces/BlockType';
import CodeBlock from '@components/CodeBlock';
import Spacing from '@oracle/elements/Spacing';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { getNewUUID } from '@utils/string';
import { pushAtIndex } from '@utils/array';

function PipelineDetail({
  mainContainerRef,
}) {
  const [blocks, setBlocks] = useState<BlockType[]>([
    {
      uuid: 'a',
    },
    {
      uuid: 'b',
    },
  ]);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null);

  const numberOfBlocks = useMemo(() => blocks.length, [blocks]);
  const addNewBlockAtIndex = useCallback((block: BlockType, idx: number) => {
  const newBlocks = pushAtIndex(block, idx, blocks);
    setBlocks(newBlocks);
  }, [
    blocks,
    setBlocks,
  ]);

  return (
    <Spacing p={PADDING_UNITS}>
      {blocks.map(({
        uuid,
      }: BlockType, idx: number) => (
        <CodeBlock
          addNewBlock={(block: BlockType) => {
            const newIndex = idx + 1;
            addNewBlockAtIndex({
              ...block,
              uuid: getNewUUID(),
            }, newIndex);
            setSelectedBlockIndex(newIndex);
          }}
          key={uuid}
          mainContainerRef={mainContainerRef}
          noDivider={idx === numberOfBlocks - 1}
          selected={idx === selectedBlockIndex}
          setSelected={(value: boolean) => setSelectedBlockIndex(value === true ? idx : null)}
        />
      ))}

      <Spacing mt={PADDING_UNITS}>
        <AddNewBlocks
          addNewBlock={(block: BlockType) => {
            addNewBlockAtIndex({
              ...block,
              uuid: getNewUUID(),
            }, numberOfBlocks);
            setSelectedBlockIndex(numberOfBlocks);
          }}
        />
      </Spacing>
    </Spacing>
  );
}

export default PipelineDetail;
