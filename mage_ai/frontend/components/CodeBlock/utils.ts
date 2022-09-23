import BlockType, {
  BLOCK_TYPE_NAME_MAPPING,
  BlockRequestPayloadType,
  BlockTypeEnum,
  CONVERTIBLE_BLOCK_TYPES,
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
    && BlockTypeEnum.CHART !== newBlock?.type
    && BlockTypeEnum.SCRATCHPAD !== newBlock?.type
    && (
      BlockTypeEnum.DATA_LOADER !== newBlock?.type
        || BlockTypeEnum.SENSOR === currentBlock.type
    )
  ) {
    upstreamBlocks.push(currentBlock.uuid);
  }

  return upstreamBlocks;
};

export const buildConvertBlockMenuItems = (
  b: BlockType,
  blocks: BlockType[],
  baseUUID: string,
  addNewBlock: (block: BlockType) => Promise<any>,
): FlyoutMenuItemType[] => {
  const upstreamBlocks = [];
  let currentIndex = blocks.findIndex(({ uuid }) => uuid === b.uuid);

  let previousBlock;
  while (!previousBlock && currentIndex >= 0) {
    previousBlock = blocks[currentIndex - 1];
    if (BlockTypeEnum.SCRATCHPAD === previousBlock?.type) {
      previousBlock = null;
    }
    currentIndex -= 1;
  }

  if (previousBlock) {
    upstreamBlocks.push(previousBlock.uuid);
  }

  return (
    CONVERTIBLE_BLOCK_TYPES.map(blockType => ({
      label: () => `Convert to ${lowercase(BLOCK_TYPE_NAME_MAPPING[blockType])}`,
      // @ts-ignore
      onClick: () => addNewBlock({
        converted_from: b.uuid,
        type: blockType,
        upstream_blocks: upstreamBlocks,
      }),
      uuid: `${baseUUID}/convert_to/${blockType}`,
    }))
  );
};
