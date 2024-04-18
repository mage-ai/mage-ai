import BlockType, { StatusTypeEnum } from '@interfaces/BlockType';
import KernelOutputType  from '@interfaces/KernelOutputType';
import PipelineType from '@interfaces/PipelineType';
import {
  EdgeType,
  NodeType,
  PortType,
  SHARED_PORT_PROPS,
  SHARED_PORT_PROPS_SQUARE,
  SideEnum,
} from './constants';
import { RunStatus } from '@interfaces/BlockRunType';
import { UNIT } from '@oracle/styles/units/spacing';
import { equals, indexBy, sortByKey } from '@utils/array';
import { getBlockNodeHeight, getBlockNodeWidth } from './BlockNode/utils';
import { getBlockRunBlockUUID } from '@utils/models/blockRun';
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
  return `parent→${uuid}`;
}

export function getParentNodeIDShared(uuids: string[]): string {
  return ['parent'].concat(sortByKey(uuids, uuid => uuid)).join('→');
}

export function getBlocksKey(blockUUIDs: string[]): string {
  return sortByKey(blockUUIDs || [], uuid => uuid).join(',');
}

export function buildEdgeID(blockUUID: string, upstreamUUID: string): string {
  return `${upstreamUUID}→${blockUUID}`;
}

export function buildEdge(blockUUID: string, upstreamUUID: string): EdgeType {
  return {
    from: upstreamUUID,
    fromPort: `${upstreamUUID}→${blockUUID}:from`,
    id: buildEdgeID(blockUUID, upstreamUUID),
    to: blockUUID,
    toPort: `${upstreamUUID}→${blockUUID}:to`,
  };
}

export function buildPortIDDownstream(upstreamBlockUUID: string, downstreamBlockUUID: string = null): string {
  return [
    upstreamBlockUUID,
    downstreamBlockUUID,
    'from',
  ].filter(n => n).join('→');
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
  ].filter(n => n).join('→');
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
  enablePorts,
  extensionBlocksByBlockUUID,
  nodeHovering,
  pipeline,
  selectedBlock,
}: {
  activeNodes: {
    [nodeID: string]: NodeType;
  };
  blockStatus: {
    [uuid: string]: {
      status: RunStatus,
      runtime?: number,
    };
  };
  blockUUIDMapping: {
    [uuid: string]: BlockType;
  };
  blocks: BlockType[];
  callbackBlocksByBlockUUID: {
    [uuid: string]: BlockType[];
  };
  conditionalBlocksByBlockUUID: {
    [uuid: string]: BlockType[];
  };
  downstreamBlocksMapping: {
    [uuid: string]: BlockType[];
  };
  enablePorts?: boolean;
  extensionBlocksByBlockUUID: {
    [uuid: string]: BlockType[];
  };
  nodeHovering?: NodeType;
  pipeline: PipelineType;
  selectedBlock?: BlockType;
}): {
  blocksWithDownstreamBlockSet: {
    [uuid: string]: {
      downstreamBlocks: BlockType[];
      upstreamBlocks: BlockType[];
    }[];
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
    [uuid: string]: {
      [uuid: string]: PortType;
    };
  } = {};

  const blocksMapping = indexBy(blocks || [], ({ uuid }) => uuid);

  const mappingUpstreamBlockSet: {
    [uuid: string]: {
      downstreamBlocks: BlockType[];
      upstreamBlocks: BlockType[];
    };
  } = {};
  blocks?.forEach((block: BlockType) => {
    if (block?.upstream_blocks?.length >= 1) {
      const arr = block?.upstream_blocks || [];
      const key = sortByKey([...arr], uuid => uuid).join(',');

      if (!(key in mappingUpstreamBlockSet)) {
        mappingUpstreamBlockSet[key] = {
          downstreamBlocks: [],
          upstreamBlocks: arr?.reduce((acc, uuid) => {
            const block2 = blocksMapping?.[uuid];
            if (block2) {
              return acc.concat(block2);
            }

            return acc;
          }, []),
        };
      }
      mappingUpstreamBlockSet[key].downstreamBlocks.push(block);
    }
  });

  const blocksInGroups = {};
  const blocksWithDownstreamBlockSet: {
    [uuid: string]: {
      downstreamBlocks: BlockType[];
      upstreamBlocks: BlockType[];
    }[];
  } = {};

  Object.values(mappingUpstreamBlockSet || {}).forEach((info) => {
    const {
      downstreamBlocks,
      upstreamBlocks,
    } = info;

    let sameDownstreamBlocksGroup = false;
    /*
     * We need to make sure certain block groupings only happen when there aren't
     * additional block connections that can break the rendering of the layout
     * in the dependency graph.
     */
    if (upstreamBlocks?.length > 1) {
      const initalDownstreamKey = getBlocksKey(upstreamBlocks?.[0]?.downstream_blocks);
      const upstreamsHaveSameDownstreams = upstreamBlocks?.every(({
        downstream_blocks: downstreamBlockUUIDs,
      }) => getBlocksKey(downstreamBlockUUIDs) === initalDownstreamKey);

      let downstreamsHaveSameUpstreams = true;
      if (downstreamBlocks?.length > 1) {
        const downstreamBlockGroupUUIDs = downstreamBlocks?.map(({ uuid }) => uuid);
        const downstreamBlocksKey = getBlocksKey(downstreamBlockGroupUUIDs);
        downstreamsHaveSameUpstreams = upstreamBlocks?.every(({
          downstream_blocks: downstreamBlockUUIDs,
        }) => getBlocksKey(downstreamBlockUUIDs) === downstreamBlocksKey);
      }

      sameDownstreamBlocksGroup = upstreamsHaveSameDownstreams && downstreamsHaveSameUpstreams;
    }
    if (downstreamBlocks?.length >= 2 && (upstreamBlocks?.length < 2 || sameDownstreamBlocksGroup)) {
      // Only group these blocks if their downstream is identical
      // or at least 2 of them have downstreams that match exactly (subgroup).
      const counts = {};
      downstreamBlocks?.forEach(({
        downstream_blocks: downstreamBlockUUIDs,
      }) => {
        if (downstreamBlockUUIDs?.length >= 1) {
          const key = getBlocksKey(downstreamBlockUUIDs);
          if (!(key in counts)) {
            counts[key] = 0;
          }
          counts[key] += 1;
        }
      });

      const countValues: number[] = (Object.values(counts || {}) || []);
      const count: number = Math.max(...countValues);

      if (!countValues?.length || count >= 2) {
        downstreamBlocks?.forEach((block2) => {
          const uuid2 = block2?.uuid;
          if (!(uuid2 in blocksInGroups)) {
            blocksInGroups[uuid2] = [];
          }
          blocksInGroups[uuid2].push(info);
        });

        upstreamBlocks?.forEach((block2) => {
          const uuid2 = block2?.uuid;
          if (!(uuid2 in blocksWithDownstreamBlockSet)) {
            blocksWithDownstreamBlockSet[uuid2] = [];
          }
          blocksWithDownstreamBlockSet[uuid2].push(info);
        });
      }
    }
  });

  blocks?.forEach((block: BlockType) => {
    const {
      tags = [],
      upstream_blocks: upstreamBlocks = [],
      uuid,
    } = block;
    const downstreamBlocks = downstreamBlocksMapping[uuid];

    if (!(uuid in ports)) {
      ports[uuid] = {};
    }

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

    const portProps: {
      height: number;
      width: number;
    } = {
      height: !activeNodes?.[uuid] ? 0 : 2 * UNIT,
      width: !activeNodes?.[uuid] ? 0 : 2 * UNIT,
    };

    const portIDUpstream = buildAddUpstreamBlockPortID(uuid);
    const portIDDownstream = buildAddDownstreamBlockPortID(uuid);

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

    if (!(uuid in blocksInGroups)) {
      if (upstreamBlocks?.length >= 1) {
        ports[uuid] = {
          ...ports?.[uuid],
          ...buildPortsUpstream(uuid, upstreamBlocks, {
            activeNodes,
          }),
        };

        upstreamBlocks?.forEach((upstreamBlockUUID: string) => {
          const edge = buildEdge(uuid, upstreamBlockUUID);
          edgesInner[edge.id] = edge;
        });
      }

      const infos = blocksWithDownstreamBlockSet?.[uuid] || [];
      const downstreamBlockSet = infos?.reduce((acc, info) => ({
        ...acc,
        ...info?.downstreamBlocks?.reduce((acc2, block2) => ({
          ...acc2,
          [block2?.uuid]: block2,
        }), {}),
      }), {});

      downstreamBlocks?.forEach(({
        uuid: uuid2,
      }) => {
        if (!(uuid2 in downstreamBlockSet)) {
          ports[uuid] = {
            ...ports?.[uuid],
            ...buildPortsDownstream(uuid, [uuid2], {
              activeNodes,
            }),
          };
        }
      });
    }
  });

  const groupsByParentID: {
    [uuid: string]: {
      downstreamBlocks: BlockType[];
      upstreamBlocks: BlockType[];
    };
  } = {};

  // Create unique groups
  // Iterate through the blocks that have a downstream as a group
  Object.entries(blocksWithDownstreamBlockSet || {})?.forEach(([
    upstreamBlockUUID,
    infos,
  ]) => {
    infos?.forEach(({
      downstreamBlocks,
      upstreamBlocks,
    }) => {
      const uuids = upstreamBlocks?.reduce((acc, block) => {
        if (block && block?.uuid) {
          return acc.concat(block?.uuid);
        }

        return acc;
      }, []);
      const parentID = getParentNodeIDShared(uuids);

      if (!(parentID in groupsByParentID)) {
        groupsByParentID[parentID] = {
          downstreamBlocks,
          upstreamBlocks,
        };
      }
    });
  });

  const subgroups = {};

  Object.entries(groupsByParentID || {}).forEach(([
    parentID,
    {
      downstreamBlocks,
      upstreamBlocks,
    },
  ]) => {
    const node = {
      data: {
        block: upstreamBlocks?.[0],
        blocks: upstreamBlocks,
        children: downstreamBlocks,
      },
      id: parentID,
    };
    nodesInner[parentID] = node;

    const subgroup2: {
      [uuid: string]: {
        downstreamBlocks: BlockType[];
        upstreamBlocks: BlockType[];
      };
    } = blocksInSameGroup(
      downstreamBlocks,
      blocksInGroups,
      blocksWithDownstreamBlockSet,
      groupsByParentID,
      parentID,
    );

    if (subgroup2) {
      subgroups[parentID] = subgroup2;
    }

    const uuidsInSubgroup = Object.values(
      subgroup2 || {},
    // @ts-ignore
    )?.reduce((acc, { upstreamBlocks: upstreamBlocks2 }) => acc.concat(
      upstreamBlocks2?.map(({ uuid: uuid3 }) => uuid3),
    ), []);

    // Each block node can only be in 1 group at a time.
    downstreamBlocks?.forEach(({ uuid: uuid2 }) => {
      if (!uuidsInSubgroup?.includes(uuid2) && uuid2 in nodesInner) {
        nodesInner[uuid2].parent = parentID;
      }
    });

    upstreamBlocks?.forEach((block) => {
      const uuid = block?.uuid;

      downstreamBlocks?.forEach(({ uuid: uuid2 }) => {
        const upstreamOrDownstreamSelected =
          selectedBlock?.uuid === uuid || selectedBlock?.uuid === uuid2;

        if (upstreamOrDownstreamSelected) {
          const edge = buildEdge(uuid2, uuid);
          edgesInner[edge.id] = edge;

          ports[uuid] = {
            ...ports?.[uuid],
            ...buildPortsDownstream(uuid, [uuid2], {
              activeNodes,
            }),
          };

          ports[uuid2] = {
            ...ports?.[uuid2],
            ...buildPortsUpstream(uuid2, [uuid], {
              activeNodes,
            }),
          };
        }
      });

      const edge = buildEdge(parentID, uuid);
      edgesInner[edge.id] = edge;

      ports[uuid] = {
        ...ports?.[uuid],
        ...buildPortsDownstream(uuid, [parentID], {
          activeNodes,
        }),
      };

      ports[parentID] = {
        ...ports?.[parentID],
        ...buildPortsUpstream(parentID, [uuid], {
          activeNodes,
        }),
      };
    });
  });

  Object.entries(subgroups || {}).forEach(([
    parentID,
    groups,
  ]) => {
    Object.entries(groups || {}).forEach(([
      parentID2,
      {
        downstreamBlocks,
        upstreamBlocks,
      },
    ]) => {
      const parentID3 = getParentNodeIDShared([parentID, parentID2]);

      const node = {
        data: {
          block: upstreamBlocks?.[0],
          blocks: upstreamBlocks,
          children: downstreamBlocks,
        },
        id: parentID3,
        parent: parentID,
      };
      nodesInner[parentID3] = node;

      upstreamBlocks?.forEach(({ uuid: uuid2 }) => {
        if (uuid2 in nodesInner) {
          nodesInner[uuid2].parent = parentID3;
        }
        const edgeID = buildEdgeID(parentID2, uuid2);
        if (edgeID in edgesInner) {
          delete edgesInner[edgeID];
        }

        if (uuid2 in ports) {
          const portID = buildPortIDDownstream(uuid2, parentID2);
          if (portID in ports?.[uuid2]) {
            delete ports[uuid2][portID];
          }
        }

        if (parentID2 in ports) {
          const portID = buildPortIDUpstream(parentID2, uuid2);
          if (portID in ports?.[parentID2]) {
            delete ports[parentID2][portID];
          }
        }
      });

      const edge = buildEdge(parentID2, parentID3);
      edgesInner[edge.id] = edge;

      ports[parentID3] = {
        ...ports?.[parentID3],
        ...buildPortsDownstream(parentID3, [parentID2], {
          activeNodes,
        }),
      };

      ports[parentID2] = {
        ...ports?.[parentID2],
        ...buildPortsUpstream(parentID2, [parentID3], {
          activeNodes,
        }),
      };
    });
  });

  if (enablePorts) {
    Object.entries(ports).forEach(([
      blockUUID,
      portsMapping,
    ]) => {
      const node = nodesInner?.[blockUUID];
      if (node) {
        node.ports = Object.values(portsMapping);
      }
    });
  }

  return {
    blocksWithDownstreamBlockSet,
    edges: Object.values(edgesInner || {}),
    nodes: Object.values(nodesInner || {}),
    ports,
  };
}

export function blocksInSameGroup(
  blocks: BlockType[],
  blocksInGroups,
  blocksWithDownstreamBlockSet,
  groupsByParentID,
  parentID,
): {
  [uuid: string]: {
    downstreamBlocks: BlockType[];
    upstreamBlocks: BlockType[];
  };
} {
  const uuids = sortByKey(blocks?.map(({ uuid }) => uuid) || [], ({ uuid }) => uuid);

  const upstreamBlockParents: {
    [uuid: string]: BlockType[];
  } = {};
  // Check to see if the current upstreams are in the same group.
  blocks?.forEach((block2) => {
    const { uuid } = block2;

    const groups = blocksInGroups?.[uuid];
    groups?.forEach((info) => {
      const {
        downstreamBlocks: downstreamBlocks2,
        upstreamBlocks: upstreamBlocks2,
      } = info;

      const uuids2 = sortByKey(
        upstreamBlocks2?.map(({ uuid }) => uuid) || [],
        ({ uuid }) => uuid,
      );

      const parentID2 = getParentNodeIDShared(uuids2);
      if (!(parentID2 in upstreamBlockParents)) {
        upstreamBlockParents[parentID2] = [];
      }
      upstreamBlockParents[parentID2].push(block2);
    });
  });

  const subgroups = {};

  // Each block node can only be in 1 group at a time.
  Object.entries(upstreamBlockParents || {}).forEach(([
    parentID2,
    blocks,
  ]) => {
    const blocks2 = blocks?.filter(({ uuid }) => blocksWithDownstreamBlockSet?.[uuid]);
    const uuids2 = blocks2?.map(({ uuid }) => uuid);
    const parentID3 = getParentNodeIDShared(uuids2);

    if (parentID3 in groupsByParentID) {
      const group = groupsByParentID?.[parentID3];
      subgroups[parentID3] = group;
    }
  });

  if (Object.keys(subgroups)?.length >= 1) {
    return subgroups;
  }
}

export function getBlockStatus({
  block,
  blockStatus,
  messages,
  noStatus,
  runningBlocks,
  runningBlocksMapping,
}: {
  block: BlockType;
  blockStatus: {
    [uuid: string]: {
      runtime?: number;
      status: RunStatus;
    };
  };
  messages: {
    [uuid: string]: KernelOutputType[];
  };
  noStatus: boolean;
  runningBlocks: BlockType[];
  runningBlocksMapping: {
    [uuid: string]: BlockType;
  };
}): {
  hasFailed?: boolean;
  isCancelled?: boolean;
  isConditionFailed?: boolean;
  isInProgress?: boolean;
  isQueued?: boolean;
  isSuccessful?: boolean;
  runtime?: number;
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

    const isInProgress = !!runningBlocksMapping?.[block?.uuid];

    return {
      hasFailed: !isInProgress && (hasError || StatusTypeEnum.FAILED === block.status),
      isInProgress,
      isQueued: isInProgress && runningBlocks[0]?.uuid !== block.uuid,
      isSuccessful: !isInProgress && ((!hasError && hasOutput) || StatusTypeEnum.EXECUTED === block.status),
    };
  }
}
