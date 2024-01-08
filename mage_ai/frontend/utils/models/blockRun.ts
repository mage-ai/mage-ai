import BlockType, { TagEnum } from '@interfaces/BlockType';

export function getBlockRunBlockUUID(block: BlockType): string {
  // Replicated block’s have a block_run block_uuid value with this convention:
  // [block_uuid]:[replicated_block_uuid]

  const {
    replicated_block: replicatedBlockUUID,
    tags,
    uuid,
  } = block;

  if (replicatedBlockUUID
    && tags?.every(tag => ![TagEnum.DYNAMIC, TagEnum.DYNAMIC_CHILD].includes(tag))
  ) {
    return `${uuid}:${replicatedBlockUUID}`;
  }

  return uuid;
}
