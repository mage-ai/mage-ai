import BlockType, { BlockTypeEnum } from 'interfaces/BlockType';
import PipelineExecutionFrameworkType, {
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from 'interfaces/PipelineType';
import {
  GroupUUIDEnum,
  PipelineExecutionFrameworkUUIDEnum,
} from '@interfaces/PipelineExecutionFramework/types';
import { ReplicationMethodEnum, StreamType } from '@interfaces/IntegrationSourceType';

interface TreeNode {
  name: string;
  children: TreeNode[];
}

export function blocksWithStreamsWithIncrementalReplicationMethod(pipeline: PipelineType): {
  [uuid: string]: {
    block: BlockType;
    streams: StreamType[];
  };
} {
  const streamsByBlockUUID = {};

  pipeline?.blocks?.forEach(block => {
    const { catalog, type, uuid } = block;

    if (BlockTypeEnum.DATA_LOADER === type && catalog?.streams) {
      const streams = catalog?.streams?.filter(
        ({ replication_method: replicationMethod }) =>
          ReplicationMethodEnum.INCREMENTAL === replicationMethod,
      );

      if (streams?.length >= 1) {
        if (!(uuid in streamsByBlockUUID)) {
          streamsByBlockUUID[uuid] = {
            block,
            streams: [],
          };
        }

        streamsByBlockUUID[uuid].streams.push(streams);
      }
    }
  });

  return streamsByBlockUUID;
}

type DependencyUUIDType = GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum | string;

export function extractNestedBlocks(
  pipeline: PipelineType | PipelineExecutionFrameworkType,
  pipelines: Record<string, PipelineType | PipelineExecutionFrameworkType>,
  opts?: {
    addBlockDependenciesToNestedPipelineBlocks?: boolean;
    addPipelineGroupsToBlocks?: boolean;
    addPipelineToBlocks?: boolean;
  },
  dependencies?: {
    downstreamBlocks?: DependencyUUIDType[];
    upstreamBlocks?: DependencyUUIDType[];
  },
): Record<string, BlockType | PipelineExecutionFrameworkBlockType> {
  const {
    addBlockDependenciesToNestedPipelineBlocks = false,
    addPipelineGroupsToBlocks = false,
    addPipelineToBlocks = false,
  } = opts || {};
  const { downstreamBlocks, upstreamBlocks } = dependencies || {};

  let mapping = {};

  pipeline?.blocks?.forEach((blockBase: BlockType) => {
    const block = { ...blockBase };

    if (downstreamBlocks && !block?.downstream_blocks) {
      block.downstream_blocks = downstreamBlocks;
    } else if (upstreamBlocks && !block?.upstream_blocks) {
      block.upstream_blocks = upstreamBlocks;
    }

    if (addPipelineToBlocks) {
      block.pipeline = pipeline;
    }

    if (addPipelineGroupsToBlocks) {
      block.groups = [...(pipeline.groups ?? []), ...(block.groups ?? [])] as any[];
    }

    const isPipeline = BlockTypeEnum.PIPELINE === block.type;
    if (isPipeline) {
      const pipeline2 = pipelines[block.uuid];

      const deps = {} as {
        downstreamBlocks?: DependencyUUIDType[];
        upstreamBlocks?: DependencyUUIDType[];
      };

      if (addBlockDependenciesToNestedPipelineBlocks) {
        [
          ['downstreamBlocks', block.downstream_blocks],
          ['upstreamBlocks', block.upstream_blocks],
        ]?.forEach(([key, arr]: [string, DependencyUUIDType[]]) => {
          arr?.forEach((uuid: string) => {
            if (uuid in pipelines) {
              const pip = pipelines[uuid];
              deps[key] ||= [];
              pip?.blocks?.forEach((b: BlockType) => {
                if (
                  ('downstreamBlocks' === key && !b?.upstream_blocks?.length) ||
                  ('upstreamBlocks' === key && !b?.downstream_blocks?.length)
                ) {
                  deps[key].push(b?.uuid);
                }
              });
            } else {
              deps[key] ||= [];
              deps[key].push(uuid);
            }
          });
        });
      }
      mapping = {
        ...mapping,
        ...extractNestedBlocks(pipeline2, pipelines, opts, deps),
      };
    }

    mapping[block.uuid] = block;
  });

  return mapping;
}

export function groupBlocksByGroups(
  blocks: (BlockType | PipelineExecutionFrameworkBlockType)[],
): Record<GroupUUIDEnum, Record<string, any>> {
  const blockGroupMap = {} as Record<GroupUUIDEnum, Record<string, any>>;
  blocks?.forEach(block => {
    (block?.groups || [])?.forEach(group => {
      const uuid = group as GroupUUIDEnum;
      blockGroupMap[uuid] ||= {};
      blockGroupMap[uuid][block.uuid] = block;
    });
  });

  return blockGroupMap;
}

export function buildTreeOfBlockGroups(paths: string[][]): TreeNode {
  const root: TreeNode = { name: 'root', children: [] };

  paths.forEach(path => {
    let currentNode = root;

    for (const name of path) {
      let nextNode = currentNode.children.find(child => child.name === name);

      if (!nextNode) {
        nextNode = { name, children: [] };
        currentNode.children.push(nextNode);
      }

      currentNode = nextNode;
    }
  });

  return root;
}
