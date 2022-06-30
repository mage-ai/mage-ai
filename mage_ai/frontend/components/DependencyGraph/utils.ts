import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import light from '@oracle/styles/themes/light';
import { ThemeType } from '@oracle/styles/themes/constants';

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

export const getNodeColor = (
  blockType: BlockTypeEnum,
  themeType: ThemeType,
) => {
  let color = (themeType?.chart || light.chart).button1;
  if (blockType === BlockTypeEnum.TRANSFORMER) {
    color = (themeType?.chart || light.chart).primary;
  } else if (blockType === BlockTypeEnum.DATA_EXPORTER) {
    color = (themeType?.chart || light.chart).button2;
  } else if (blockType === BlockTypeEnum.SCRATCHPAD) {
    color = (themeType?.chart || light.chart).button3;
  }

  return color;
};
