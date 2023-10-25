import BlockType, { StatusTypeEnum } from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import {
  EdgeType,
  NodeType,
  PortType,
  SHARED_PORT_PROPS,
  SHARED_PORT_PROPS_SQUARE,
  SideEnum,
} from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { equals, indexBy, sortByKey } from '@utils/array';
import { getBlockNodeHeight, getBlockNodeWidth } from './BlockNode/utils';
import {
  getMessagesWithType,
  hasErrorOrOutput,
} from '@components/CodeBlock/utils';
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

export function getParentNodeID(uuid: string): string {
  return `parent-${uuid}`;
}

export function getParentNodeIDShared(uuids: string[]): string {
  return ['parent'].concat(sortByKey(uuids, uuid => uuid)).join('-');
}

export function buildEdgeID(blockUUID: string, upstreamUUID: string): string {
  return `${upstreamUUID}-${blockUUID}`
}

export function buildEdge(blockUUID: string, upstreamUUID: string): EdgeType {
  return {
    from: upstreamUUID,
    fromPort: `${upstreamUUID}-${blockUUID}-from`,
    id: buildEdgeID(blockUUID, upstreamUUID),
    to: blockUUID,
    toPort: `${upstreamUUID}-${blockUUID}-to`,
  };
}

export function buildPortIDDownstream(upstreamBlockUUID: string, downstreamBlockUUID: string = null): string {
  return [
    upstreamBlockUUID,
    downstreamBlockUUID,
    'from',
  ].filter(n => n).join('-');
}

export function buildPortsDownstream(
  upstreamBlockUUID: string,
  downstreamBlockUUIDs: string[],
  opts?: {
    activeNodes: {
      [nodeID: string]: NodeType;
    };
  },
): {
  [id: string]: PortType;
} {
  const mapping = {};

  const portProps: {
    disabled?: boolean;
    height: number;
    width: number;
  } = {
    ...SHARED_PORT_PROPS_SQUARE,
    disabled: true,
  };

  if (opts?.activeNodes?.[upstreamBlockUUID]) {
    portProps.height = 0;
    portProps.width = 0;
  }

  if (downstreamBlockUUIDs?.length >= 1) {
    downstreamBlockUUIDs.forEach((downstreamBlockUUID: string) => {
      const portID = buildPortIDDownstream(upstreamBlockUUID, downstreamBlockUUID);
      mapping[portID] = {
        ...portProps,
        id: portID,
        side: SideEnum.SOUTH,
      };
    });
  } else {
    const portID = buildPortIDDownstream(upstreamBlockUUID);
    mapping[portID] = {
      ...portProps,
      id: portID,
      side: SideEnum.SOUTH,
    };
  }

  return mapping;
}

export function buildPortIDUpstream(downstreamBlockUUID: string, upstreamBlockUUID: string = null): string {
  return [
    upstreamBlockUUID,
    downstreamBlockUUID,
    'to',
  ].filter(n => n).join('-');
}

export function buildPortsUpstream(
  downstreamBlockUUID: string,
  upstreamBlockUUIDs: string[],
  opts?: {
    activeNodes: {
      [nodeID: string]: NodeType;
    };
  },
): {
  [id: string]: PortType;
} {
  const mapping = {};

  const portProps: {
    disabled?: boolean;
    height: number;
    width: number;
  } = {
    ...SHARED_PORT_PROPS_SQUARE,
    disabled: true,
  };

  if (opts?.activeNodes?.[downstreamBlockUUID]) {
    portProps.height = 0;
    portProps.width = 0;
  }

  if (upstreamBlockUUIDs?.length >= 1) {
    upstreamBlockUUIDs.forEach((upstreamBlockUUID: string) => {
      const portID = buildPortIDUpstream(downstreamBlockUUID, upstreamBlockUUID);
      mapping[portID] = {
        ...portProps,
        id: portID,
        side: SideEnum.NORTH,
      };
    });
  } else {
    const portID = buildPortIDUpstream(downstreamBlockUUID);
    mapping[portID] = {
      ...portProps,
      id: portID,
      side: SideEnum.NORTH,
    };
  }

  return mapping;
}

export function buildAddUpstreamBlockPortID(blockUUID: string): string {
  return `${blockUUID}-upstream-add`;
}

export function buildAddDownstreamBlockPortID(blockUUID: string): string {
  return `${blockUUID}-dowstream-add`;
}

export function buildNodesEdgesPorts({
  activeNodes: activeNodesProp,
  blockStatus,
  blockUUIDMapping,
  blocks,
  callbackBlocksByBlockUUID,
  conditionalBlocksByBlockUUID,
  downstreamBlocksMapping,
  extensionBlocksByBlockUUID,
  nodeHovering,
  pipeline,
  selectedBlock,
}: {
  activeNodes: {
    [nodeID: string]: NodeType;
  };
  blockStatus: StatusTypeEnum;
  blockUUIDMapping: {
    [uuid: string]: BlockType;
  };
  blocks: BlockType[];
  callbackBlocksByBlockUUID: {
    [uuid: string]: BlockType;
  };
  conditionalBlocksByBlockUUID: {
    [uuid: string]: BlockType;
  };
  downstreamBlocksMapping: {
    [uuid: string]: BlockType;
  };
  extensionBlocksByBlockUUID: {
    [uuid: string]: BlockType;
  };
  nodeHovering?: NodeType;
  pipeline: PipelineType;
  selectedBlock?: BlockType;
}): {
  blocksWithSameDownstreamBlocks: {
    [uuid: string]: {
      blocks: BlockType[];
      downstreamBlocks: BlockType[];
    };
  };
  edges: EdgeType[];
  nodes: NodeType[];
  ports: {
    [uuid: string]: {
      [uuid: string]: PortType;
    };
  };
} {
  const activeNodes = {
    ...activeNodesProp,
  };

  if (nodeHovering) {
    activeNodes[nodeHovering?.id] = nodeHovering;
  }

  const parents = {};
  const nodesInner: {
    [id: string]: NodeType;
  } = {};
  const edgesInner: {
    [id: string]: EdgeType;
  } = {};
  const ports: {
    [uuid: string]: PortType;
  } = [];

  const blocksMapping = indexBy(blocks || [], ({ uuid }) => uuid);

  const mappingOfDownstreamBlockSet = {};
  blocks?.forEach((block: BlockType) => {
    if (block?.downstream_blocks?.length >= 1) {
      const arr = block?.downstream_blocks || [];
      const key = sortByKey(arr, uuid => uuid).join(',');

      if (!(key in mappingOfDownstreamBlockSet)) {
        mappingOfDownstreamBlockSet[key] = {
          blocks: [],
          downstreamBlocks: arr?.map(uuid => blocksMapping?.[uuid]),
        };
      }
      mappingOfDownstreamBlockSet[key].blocks.push(block);
    }
  });

  const blocksWithSameDownstreamBlocks = {};
  Object.values(mappingOfDownstreamBlockSet).forEach((obj) => {
    const {
      blocks: arr,
    } = obj;

    if (arr?.length >= 2) {
      arr?.forEach((blockInner: BlockType) => {
        blocksWithSameDownstreamBlocks[blockInner?.uuid] = obj;
      });
    }
  });

  blocks?.forEach((block: BlockType) => {
    const {
      tags = [],
      upstream_blocks: upstreamBlocks = [],
      uuid,
    } = block;
    const downstreamBlocks = downstreamBlocksMapping[uuid];

    const callbackBlocks = callbackBlocksByBlockUUID?.[block?.uuid];
    const conditionalBlocks = conditionalBlocksByBlockUUID?.[block?.uuid];
    const extensionBlocks = extensionBlocksByBlockUUID?.[block?.uuid];

    nodesInner[uuid] = {
      data: {
        block,
      },
      height: getBlockNodeHeight(block, pipeline, {
        blockStatus,
        callbackBlocks,
        conditionalBlocks,
        extensionBlocks,
      }),
      id: uuid,
      width: getBlockNodeWidth(block, pipeline, {
        blockStatus,
        callbackBlocks,
        conditionalBlocks,
        extensionBlocks,
      }),
    };

    if (!(uuid in ports)) {
      ports[uuid] = {};
    }

    const portIDUpstream = buildAddUpstreamBlockPortID(uuid);
    const portIDDownstream = buildAddDownstreamBlockPortID(uuid);

    const portProps: {
      height: number;
      width: number;
    } = {
      height: !activeNodes?.[uuid] ? 0 : 2 * UNIT,
      width: !activeNodes?.[uuid] ? 0 : 2 * UNIT,
    };

    ports[uuid][portIDUpstream] = {
      ...portProps,
      id: portIDUpstream,
      side: SideEnum.NORTH,
    };

    ports[uuid][portIDDownstream] = {
      ...portProps,
      id: portIDDownstream,
      side: SideEnum.SOUTH,
    };

    if (
      !downstreamBlocks?.length
        && (
          upstreamBlocks?.length === 1
            // If every upstream block for the current block has the same exact set of downstream
            // block, then use a parent group.
            || upstreamBlocks?.every(
              upstreamBlockUUID => upstreamBlockUUID in blocksWithSameDownstreamBlocks,
            )
        )
    ) {
      upstreamBlocks?.forEach((uuidUp) => {
        const upstreamBlock = blockUUIDMapping?.[uuidUp];
        if (!(uuidUp in parents)) {
          parents[uuidUp] = {
            block: upstreamBlock,
            children: {},
          };
        }
        parents[uuidUp].children[block?.uuid] = block;
      });
    } else {
      upstreamBlocks?.forEach((upstreamBlockUUID: string) => {
        const edge = buildEdge(uuid, upstreamBlockUUID);
        edgesInner[edge.id] = edge;
      });

      if (downstreamBlocks?.length >= 1) {
        ports[uuid] = {
          ...ports?.[uuid],
          ...buildPortsDownstream(uuid, downstreamBlocks?.map(({ uuid: uuid2 }) => uuid2), {
            activeNodes,
          }),
        };
      }

      if (upstreamBlocks?.length >= 1) {
        ports[uuid] = {
          ...ports?.[uuid],
          ...buildPortsUpstream(uuid, upstreamBlocks, {
            activeNodes,
          }),
        };
      }
    }
  });

  const sharedParentNodes = {};

  Object.entries(parents || {}).forEach(([
    upstreamBlockUUID,
    {
      block,
      children,
    },
  ]) => {
    const downstreamBlocks = Object.values(children || {});
    if (downstreamBlocks?.length >= 2) {
      if (upstreamBlockUUID in blocksWithSameDownstreamBlocks) {
        return;
      }

      const parentID = getParentNodeID(upstreamBlockUUID);

      const node = {
        data: {
          block,
          children: downstreamBlocks,
        },
        id: parentID,
      };
      nodesInner[parentID] = node;

      if (!(upstreamBlockUUID in ports)) {
        ports[upstreamBlockUUID] = {};
      }

      const upstreamOrDownstreamSelected = selectedBlock?.uuid === upstreamBlockUUID
        || downstreamBlocks?.find(({ uuid }) => selectedBlock?.uuid === uuid);

      downstreamBlocks?.forEach(({ uuid }) => {
        if (upstreamOrDownstreamSelected) {
          const edge = buildEdge(uuid, upstreamBlockUUID);
          edgesInner[edge.id] = edge;

          const portsForUpstream  ={
            ...ports?.[upstreamBlockUUID],
            ...buildPortsDownstream(upstreamBlockUUID, [uuid], {
              activeNodes,
            }),
          };
          ports[upstreamBlockUUID] = portsForUpstream;
        } else {
          // Need to remove the ports for every parent.
          const portID = buildPortIDDownstream(upstreamBlockUUID, uuid);

          if (upstreamBlockUUID in ports && portID in ports?.[upstreamBlockUUID]) {
            delete ports?.[upstreamBlockUUID]?.[portID];
          }
        }
      });

      downstreamBlocks?.forEach(({ uuid }) => {
        if (uuid in nodesInner) {
          nodesInner[uuid].parent = parentID;
        }
      });

      if (!upstreamOrDownstreamSelected) {
        const edge = buildEdge(parentID, upstreamBlockUUID);
        edgesInner[edge.id] = edge;

        const portsForParent = {
          ...buildPortsUpstream(parentID, [upstreamBlockUUID], {
            activeNodes,
          }),
        };
        ports[parentID] = portsForParent;

        const portsForUpstream  ={
          ...ports?.[upstreamBlockUUID],
          ...buildPortsDownstream(upstreamBlockUUID, [parentID], {
            activeNodes,
          }),
        };
        ports[upstreamBlockUUID] = portsForUpstream;
      }
    } else {
      downstreamBlocks?.forEach(({ uuid }) => {
        const edge = buildEdge(uuid, upstreamBlockUUID);
        edgesInner[edge.id] = edge;

        ports[uuid] = {
          ...ports?.[uuid],
          ...buildPortsUpstream(uuid, [upstreamBlockUUID]),
        };
      });
    }
  });

  Object.values(mappingOfDownstreamBlockSet || {}).forEach(({
    blocks: blocks2,
    downstreamBlocks: downstreamBlocks2,
  }) => {
    if (!blocks2?.every(({ uuid }) => blocksWithSameDownstreamBlocks?.[uuid])) {
      return;
    }

    // 1 node for the parent that groups the downstream blocks
    // Parent node will have N ports and N edges equal to the number of blocks.
    // Each block will have N ports and N edges equal to the number of groups.

    const parentID = getParentNodeIDShared(blocks2?.map(({ uuid }) => uuid));

    const node = {
      data: {
        block: blocks?.[0],
        blocks: blocks2,
        children: downstreamBlocks2,
      },
      id: parentID,
    };
    nodesInner[parentID] = node;

    blocks2?.forEach(({
      uuid: upstreamBlockUUID,
    }: BlockType) => {
      if (!(upstreamBlockUUID in ports)) {
        ports[upstreamBlockUUID] = {};
      }

      const upstreamOrDownstreamSelected = selectedBlock?.uuid === upstreamBlockUUID
        || downstreamBlocks2?.find(({ uuid }) => selectedBlock?.uuid === uuid);

      downstreamBlocks2?.forEach(({ uuid }) => {
        if (upstreamOrDownstreamSelected) {
          const edge = buildEdge(uuid, upstreamBlockUUID);
          edgesInner[edge.id] = edge;

          const portsForUpstream  ={
            ...ports?.[upstreamBlockUUID],
            ...buildPortsDownstream(upstreamBlockUUID, [uuid], {
              activeNodes,
            }),
          };
          ports[upstreamBlockUUID] = portsForUpstream;
        } else {
          // Need to remove the ports for every parent.
          const portID = buildPortIDDownstream(upstreamBlockUUID, uuid);

          if (upstreamBlockUUID in ports && portID in ports?.[upstreamBlockUUID]) {
            delete ports?.[upstreamBlockUUID]?.[portID];
          }
        }

        if (uuid in nodesInner) {
          nodesInner[uuid].parent = parentID;
        }
      });

      if (!upstreamOrDownstreamSelected) {
        const edge = buildEdge(parentID, upstreamBlockUUID);
        edgesInner[edge.id] = edge;

        const portsForParent = {
          ...buildPortsUpstream(parentID, [upstreamBlockUUID], {
            activeNodes,
          }),
        };
        ports[parentID] = portsForParent;

        const portsForUpstream  ={
          ...ports?.[upstreamBlockUUID],
          ...buildPortsDownstream(upstreamBlockUUID, [parentID], {
            activeNodes,
          }),
        };
        ports[upstreamBlockUUID] = portsForUpstream;
      }
    });
  });

  Object.entries(ports).forEach(([
    blockUUID,
    portsMapping,
  ]) => {
    const node = nodesInner?.[blockUUID];
    if (node) {
      node.ports = Object.values(portsMapping);
    }
  });

  return {
    blocksWithSameDownstreamBlocks,
    edges: Object.values(edgesInner || {}),
    nodes: Object.values(nodesInner || {}),
    ports,
  };
}


export function getBlockStatus({
  block,
  blockStatus,
  messages,
  noStatus,
  runningBlocks,
  runningBlocksMapping,
}: {
  block: BlockType[];
  blockStatus: StatusTypeEnum;
  messages: string[];
  noStatus: boolean;
  runningBlocks: BlockType[];
  runningBlocksMapping: {
    [uuid: string]: BlockType;
  };
}): {
  hasFailed: boolean;
  isInProgress: boolean;
  isQueued: boolean;
  isSuccessful: boolean;
} {
  if (noStatus || !block) {
    return {};
  } else if (blockStatus) {
    const {
      status,
      runtime,
    } = blockStatus?.[getBlockRunBlockUUID(block)] || {};

    return {
      hasFailed: RunStatus.FAILED === status,
      isCancelled: RunStatus.CANCELLED === status,
      isConditionFailed: RunStatus.CONDITION_FAILED === status,
      isInProgress: RunStatus.RUNNING === status,
      isQueued: RunStatus.INITIAL === status,
      isSuccessful: RunStatus.COMPLETED === status,
      runtime,
    };
  } else {
    const messagesWithType = getMessagesWithType(messages?.[block?.uuid] || []);
    const {
      hasError,
      hasOutput,
    } = hasErrorOrOutput(messagesWithType);

    const isInProgress = runningBlocksMapping?.[block?.uuid];

    return {
      hasFailed: !isInProgress && (hasError || StatusTypeEnum.FAILED === block.status),
      isInProgress,
      isQueued: isInProgress && runningBlocks[0]?.uuid !== block.uuid,
      isSuccessful: !isInProgress && ((!hasError && hasOutput) || StatusTypeEnum.EXECUTED === block.status),
    };
  }
}
