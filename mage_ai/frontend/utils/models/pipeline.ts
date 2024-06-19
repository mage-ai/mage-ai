import BlockType, { BlockTypeEnum } from 'interfaces/BlockType';
import PipelineExecutionFrameworkType, { PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from 'interfaces/PipelineType';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
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

  pipeline?.blocks?.forEach((block) => {
    const {
      catalog,
      type,
      uuid,
    } = block;

    if (BlockTypeEnum.DATA_LOADER === type && catalog?.streams) {
      const streams = catalog?.streams?.filter(({
        replication_method: replicationMethod,
      }) => ReplicationMethodEnum.INCREMENTAL === replicationMethod);

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


export function extractNestedBlocks(
  pipeline: PipelineType | PipelineExecutionFrameworkType,
  pipelines: Record<string, PipelineType | PipelineExecutionFrameworkType>,
): Record<string, any> {
  let mapping = {};

  pipeline?.blocks?.forEach((block) => {
    mapping[block.uuid] = block

    if (BlockTypeEnum.PIPELINE === block.type) {
      mapping = {
        ...mapping,
        ...extractNestedBlocks(pipelines[block.uuid], pipelines),
      };
    }
  });

  return mapping;
}

export function groupBlocksByGroups(
  blocks: (BlockType | PipelineExecutionFrameworkBlockType)[],
): Record<GroupUUIDEnum, Record<string, any>> {
  const blockGroupMap = {} as Record<GroupUUIDEnum, Record<string, any>>;
  blocks?.forEach((block) => {
    (block?.groups || [])?.forEach((group) => {
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

    for (let name of path) {
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
