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
import { getBlockNodeHeight, getBlockNodeWidth } from './BlockNode/utils';
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
  activeNodes,
  blockStatus,
  blockUUIDMapping,
  blocks,
  callbackBlocksByBlockUUID,
  conditionalBlocksByBlockUUID,
  downstreamBlocksMapping,
  extensionBlocksByBlockUUID,
  pipeline,
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
  pipeline: PipelineType;
}): {
  edges: EdgeType[];
  nodes: NodeType[];
  ports: {
    [uuid: string]: {
      [uuid: string]: PortType;
    };
  };
} {
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

  blocks.forEach((block: BlockType) => {
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

    if (upstreamBlocks?.length === 1 && !downstreamBlocks?.length) {
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

  Object.entries(parents || {}).forEach(([
    upstreamBlockUUID,
    {
      block,
      children,
    },
  ]) => {
    const downstreamBlocks = Object.values(children || {});
    if (downstreamBlocks?.length >= 2) {
      const parentID = getParentNodeID(upstreamBlockUUID);

      nodesInner[parentID] = {
        data: {
          block,
          children: downstreamBlocks,
        },
        id: parentID,
      };

      downstreamBlocks?.forEach(({ uuid }) => {
        if (uuid in nodesInner) {
          nodesInner[uuid].parent = parentID;
        }

        const portID = buildPortIDDownstream(upstreamBlockUUID, uuid);

        if (upstreamBlockUUID in ports && portID in ports?.[upstreamBlockUUID]) {
          delete ports?.[upstreamBlockUUID]?.[portID];
        }
      });

      if (!(upstreamBlockUUID in ports)) {
        ports[upstreamBlockUUID] = {};
      }

      ports[upstreamBlockUUID] = {
        ...ports?.[upstreamBlockUUID],
        ...buildPortsDownstream(upstreamBlockUUID, [parentID], {
          activeNodes,
        }),
      };

      ports[parentID] = {
        ...buildPortsUpstream(parentID, [upstreamBlockUUID], {
          activeNodes,
        }),
      };

      const edge = buildEdge(parentID, upstreamBlockUUID);
      edgesInner[edge.id] = edge;
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
    edges: Object.values(edgesInner || {}),
    nodes: Object.values(nodesInner || {}),
    ports,
  };
}
