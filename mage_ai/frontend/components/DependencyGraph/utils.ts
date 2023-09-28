import BlockType from '@interfaces/BlockType';
import { SideEnum } from './constants';
import { roundNumber } from '@utils/string';

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

export const getRuntimeText = (runtime: number) => {
  const runTimeInSeconds = runtime / 1000;
  const rounding = 4 - Math.floor(runTimeInSeconds).toString().length;
  let runtimeValue = roundNumber(runTimeInSeconds, rounding >= 0 ? rounding : 0);
  let runtimeUnit = 's';

  if (runtimeValue > 1000) {
    runtimeValue = roundNumber(runtimeValue / 60, 0);
    runtimeUnit = 'm';
  }
  return `${runtimeValue}${runtimeUnit}`;
};

export const isActivePort = (
  activePort: { id: string, side: SideEnum },
  node: { id: string },
): boolean => {
  const { id: portId, side: portSide } = activePort || {};
  const nodeId = node?.id;
  if (portSide === SideEnum.NORTH) {
    return portId?.endsWith(`${nodeId}-to`);
  } else if (portSide === SideEnum.SOUTH) {
    return portId?.startsWith(nodeId);
  }

  return false;
};
