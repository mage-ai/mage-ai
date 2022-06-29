import BlockType from '@interfaces/BlockType';

export const getFinalLevelIndex = (
  uptreamBlockUUIDs: string[],
  blockUUIDMapping: { [key: string]: BlockType },
  checkedBlocks: string[] = [],
) => {
  if (uptreamBlockUUIDs.length === 0) {
    return 0;
  }

  const levels = uptreamBlockUUIDs
    .filter((uuid) => !checkedBlocks.includes(uuid))
    .map((uuid) => (1
      + getFinalLevelIndex(
        blockUUIDMapping[uuid].upstream_blocks,
        blockUUIDMapping,
        [...checkedBlocks, uuid],
      )
    ));

  return Math.max(...levels);
};
