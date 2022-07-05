import React, { useContext } from 'react';
import BlockType from '@interfaces/BlockType';

type BlockContextType = {
  addNewBlockAtIndex: (
    block: BlockType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
  ) => void;
  blocks: BlockType[];
  runningBlocks: BlockType[];
  selectedBlock: BlockType;
  setBlocks: (blocks: BlockType[]) => void;
  setRunningBlocks: (blocks: BlockType[]) => void;
  setSelectedBlock: (block: BlockType) => void;
};

const BlockContext = React.createContext<BlockContextType>({
  addNewBlockAtIndex: null,
  blocks: [],
  runningBlocks: [],
  selectedBlock: null,
  setBlocks: null,
  setRunningBlocks: null,
  setSelectedBlock: null,
});

export const useBlockContext = () => useContext(BlockContext);

export default BlockContext;
