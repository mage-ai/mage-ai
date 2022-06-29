import BlockType from '@interfaces/BlockType';

export const getFinalLevelIndex = (
  downstreamBlockUUIDs: string[],
  blockUUIDMapping: { [key: string]: BlockType },
  checkedBlocks: string[] = [],
) => {
  if (downstreamBlockUUIDs.length === 0) {
    return 0;
  }

  const levels = downstreamBlockUUIDs
    .filter((uuid) => !checkedBlocks.includes(uuid))
    .map((uuid) => (1
      + getFinalLevelIndex(
        blockUUIDMapping[uuid].downstream_blocks,
        blockUUIDMapping,
        [...checkedBlocks, uuid],
      )
    ));

  return Math.max(...levels);
};
