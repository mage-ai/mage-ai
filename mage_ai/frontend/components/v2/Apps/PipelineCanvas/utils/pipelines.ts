import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import BlockType, { BlockPipelineType, BlockTypeEnum } from 'interfaces/BlockType';
import PipelineType from 'interfaces/PipelineType';

export function extractNestedBlocks(
  pipeline: PipelineType,
  pipelines: Record<string, PipelineType>,
): Record<string, any> {
  let mapping = {
    [pipeline.uuid]: {
      ...pipeline,
      downstream_blocks: [],
      pipeline: pipeline,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [],
    },
  };

  pipeline?.blocks?.forEach((block) => {
    mapping[block.uuid] = {
      ...block,
      pipeline: pipeline,
    } as any;

    if (BlockTypeEnum.PIPELINE === block.type) {
      mapping = {
        ...mapping,
        ...extractNestedBlocks(pipelines[block.uuid], pipelines),
      };
    }
  });

  return mapping;
}

export const groupBlocksByGroups = (framework: PipelineExecutionFrameworkType) => {
  const blockGroupMap = {} as Record<GroupUUIDEnum, Record<string, any>>;

  framework?.blocks?.forEach((block) => {
    blockGroupMap[block.uuid] ||= {};
    blockGroupMap[block.uuid] = block
    ;
    block.groups.forEach((group) => {
      const uuid = group as GroupUUIDEnum;

      if (!blockGroupMap[uuid]) {
        blockGroupMap[uuid] = {};
      }

      blockGroupMap[uuid][block.uuid] = block;
    });
  });

  return blockGroupMap;
};
