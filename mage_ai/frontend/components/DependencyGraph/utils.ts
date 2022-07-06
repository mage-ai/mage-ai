import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import dark from '@oracle/styles/themes/dark';
import { ThemeType } from '@oracle/styles/themes/constants';

export const getFinalLevelIndex = (
  uptreamBlockUUIDs: string[],
  blockUUIDMapping: { [key: string]: BlockType },
  checkedBlocks: string[] = [],
) => {
  if (!uptreamBlockUUIDs?.length) {
    return 0;
  }

  const levels = uptreamBlockUUIDs
    .filter((uuid) => !checkedBlocks.includes(uuid))
    .map((uuid) => (1
      + getFinalLevelIndex(
        blockUUIDMapping[uuid]?.upstream_blocks,
        blockUUIDMapping,
        [...checkedBlocks, uuid],
      )
    ));

  return Math.max(...levels);
};
