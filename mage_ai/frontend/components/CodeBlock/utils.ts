import BlockType, {
  BlockRequestPayloadType,
  BlockTypeEnum,
  CONVERTIBLE_BLOCK_TYPES,
  BLOCK_TYPE_NAME_MAPPING,
} from '@interfaces/BlockType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { lowercase } from '@utils/string';

export const getUpstreamBlockUuids = (
  currentBlock: BlockType,
  newBlock?: BlockRequestPayloadType,
): string[] => {
  const upstreamBlocks = newBlock?.upstream_blocks || [];

  if (BlockTypeEnum.CHART !== currentBlock.type
    && BlockTypeEnum.SCRATCHPAD !== currentBlock.type
    && BlockTypeEnum.DATA_LOADER !== newBlock?.type
    && BlockTypeEnum.CHART !== newBlock?.type
    && BlockTypeEnum.SCRATCHPAD !== newBlock?.type
  ) {
    upstreamBlocks.push(currentBlock.uuid);
  }

  return upstreamBlocks;
};

export const buildConvertBlockMenuItems = (
  b: BlockType,
  blocks: BlockType[],
  baseUUID: string,
  updateBlock: ({ block: BlockType }) => void,
): FlyoutMenuItemType[] => {
  const upstreamBlocks = [];
  const currentIndex = blocks.findIndex(({ uuid }) => uuid === b.uuid);
  const previousBlock = blocks[currentIndex - 1];
  if (previousBlock) {
    upstreamBlocks.push(previousBlock.uuid);
  }

  return (
    CONVERTIBLE_BLOCK_TYPES.map(blockType => ({
      label: () => `Convert to ${lowercase(BLOCK_TYPE_NAME_MAPPING[blockType])}`,
      // @ts-ignore
      onClick: () => updateBlock({
        block: {
          ...b,
          type: blockType,
          upstream_blocks: upstreamBlocks,
        },
      }),
      uuid: `${baseUUID}/convert_to/${blockType}`,
    }))
  );
};
