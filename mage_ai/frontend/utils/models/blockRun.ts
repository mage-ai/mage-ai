import BlockType from '@interfaces/BlockType';

export function getBlockRunBlockUUID(block: BlockType): string {
  // Replicated block’s have a block_run block_uuid value with this convention:
  // [block_uuid]:[replicated_block_uuid]

  const {
    uuid,
    replicated_block: replicatedBlockUUID,
  } = block;

  if (replicatedBlockUUID) {
    return `${uuid}:${replicatedBlockUUID}`;
  }

  return uuid;
}
